
const Discord  = require('discord.js');
const Command = require('../Command');
const { FIND_THREAD, ADD_THREADMESSAGE, CREATE_THREAD } 
  = require('../../APIFunctions/thread');

const ITEM_PER_PAGE = 5;
  
module.exports = new Command({
  name: 'no-prefix threadmessage',
  regex: new RegExp(/^\|\s*(\d{4,13})\s*\|/),
  description: 'Create or add to a thread with an ID',
  category: 'custom threads',
  permissions: 'general',
  execute: async (message) => {
    await message.delete();
    /**
     * @param {Bool} messageMode 
     * True = User is creating thread or adding message to thread
     * False = User looking at threads with starting ID
     */
    let messageMode = /^\|\s*(\d{4,13})\s*\|\s*(.+)/.test(message);
    const data = 
    {
      threadID : /^\|\s*(\d{4,13})\s*\|/.exec(message)[1],
      messageID : message.id, 
      topic: messageMode ? 
        /^\|\s*(\d{4,13})\s*\|\s*(.{0,10})/.exec(message)[2] : '',
      creatorID: message.author.id,
      guildID : message.guild.id,
      threadMsg : messageMode ? 
        /^\|\s*(\d{4,13})\s*\|\s*(.+)/.exec(message)[2] : '',
    };
    //  MESSAGE HANDLING
    let queryThread = await FIND_THREAD(data);
    if(queryThread.error)
    {
      message.channel
        .send('Error')
        .then((msg) => msg.delete(10000));
      return;
    }
    if(messageMode)
    {
      switch (queryThread.responseData.length) {
        case 0:   
          await createNewThread(data, message); 
          break;
        case 1:   
          await addMessageToThread(data, message, queryThread);
          break;
        default:  
          await multipleThreadResults(data, message, queryThread);
      }
    }
    else
      Pagination(data, message, queryThread, false);
  }
});
/** 
 * Below is all the supporting functions
 * @param {Object} data an enumeration containing all 
 * necessary data to do APIfunction calls, and make embeds
 * @param {Discord.Message} message the original message 
 * that started this command
 **/
async function createNewThread(data, message){
  //  confrim act
  const confirmAction = async (topic) =>
  {
    const confirmEmbed = new Discord.RichEmbed();
    confirmEmbed.setTitle('Create new thread?').addField('Topic: ', topic);
    const confirmMessage = await message.channel.send(confirmEmbed);
    confirmMessage
      .react('👍')
      .then(() => confirmMessage.react('👎'))
      .catch(() => null);
    const filter = (reaction, user) => {
      return (
        ['👍', '👎'].includes(reaction.emoji.name) &&
        user.id === message.author.id
      );
    };

    return await confirmMessage
      .awaitReactions(filter, { max: 1, time: 30000, errors: ['time'] })
      .then((collected) => {
        const reaction = collected.first();
        confirmMessage.delete();
        return reaction.emoji.name === '👍';
      })
      .catch(() => {
        confirmMessage.delete();
        message.channel
          .send('Not created')
          .then((msg) => msg.delete(10000));
        return false;
      });
  };

  const confirmed = await confirmAction(data.topic);  
  if(!confirmed)
  {
    await message.channel
      .send('Not created')
      .then((msg) => msg.delete(10000));
    return;
  }
  if(confirmed)
  {
    const autogenID = message.createdTimestamp
      .toString().split('').reverse().join(''); 
      //  flips the time stamp
    data.threadID = data.threadID + autogenID.substr(data.threadID.length);
    const createThread = await CREATE_THREAD(data);
    if(createThread.error)
    {
      message.channel
        .send('Error creating')
        .then((msg) => msg.delete(10000));
      return;
    }
    const threadCreateEmbed = new Discord.RichEmbed()
      .setColor('#301934')
      .setTitle(`Created Thread ${createThread.responseData.threadID}`)
      .addField('Topic', `${createThread.responseData.topic}`);
    return await message.channel.send(threadCreateEmbed);
  }
}
/**
 * @param {Object} data an enumeration containing all 
 * necessary data to do APIfunction calls, and make embeds
 * @param {Discord.Message} message the original message 
 * that started this command
 * @param {araay} queryThread the response from FIND_THREAD(data). 
 * IMPORTANT: HAS TO BE THE RESPONSE FROM FIND_THREAD
 **/
async function addMessageToThread(data, message, queryThread){
  //  We're adding in a message to the ID that was searched
  data.threadID = queryThread.responseData[0].threadID;
  const addMsg = await ADD_THREADMESSAGE(data);
  if(addMsg.error)
  {
    message.channel
      .send('Error adding')
      .then((msg) => msg.delete(10000));
    return;
  }
  const addedEmbed = new Discord.RichEmbed()
    .setColor('#301934')
    .setTitle(`Added message to Thread ${data.threadID}`)
    .addField('Message', `${data.threadMsg}`);
  await message.channel
    .send(addedEmbed)
    .then((msg) => msg.delete(10000));
}

/**
 * @param {Object} data an enumeration containing 
 * all necessary data to do APIfunction calls, and make embeds
 * @param {Discord.Message} message the original message 
 * that started this command
 * @param {araay} queryThread the response from FIND_THREAD(data). 
 * IMPORTANT: HAS TO BE RESPONSE FROM FIND_THREAD
 **/
async function multipleThreadResults(data, message, queryThread){
  let emojiCollector 
   = await Pagination(data, message, queryThread, true);
  /** 
   * Create Message collector
   * @param {Discord.Message} m is message collected by discord
   * new filter for message collector 
   **/ 
  let filter = (m) => {
    let regex = new RegExp('^'+data.threadID+'\\d+'); 
    let newID = m.content.match(regex);
    return (
      /** 
       * if regex matches (new id starts with old id) and 
       * authors are same then message is collected
       **/ 
      newID != null &&    
      m.author.id === message.author.id
    );
  };
  const messageCollector = message.channel
    .createMessageCollector(filter, { time: 300000 });
  const collectMessage = async (messageIn) =>
  {
    messageIn.delete();
    let temp = data.threadID;
    data.threadID =  messageIn.content;
    //  choice depends on how many threads are returned
    let queryThread = await FIND_THREAD(data);
    switch (queryThread.responseData.length) {
      case 0:  
        data.threadID = temp; 
        message.channel
          .send(
            new Discord.RichEmbed()
              .setColor('#301934')
              .setTitle('No results, try another ID.')
          )
          .then((msg) => msg.delete(10000));
        break;
      case 1:   
        emojiCollector.stop(['The user has chosen a new threadID']);
        await addMessageToThread(data, message, queryThread);
        break;
      default:  
        emojiCollector.stop(['The user has chosen a new threadID']);
        await multipleThreadResults(data, message, queryThread);
    }
  };
  messageCollector.on('collect', collectMessage);
  //  when collector is turned off, previous messages
  emojiCollector.on('end', async () => { 
    messageCollector.stop();
  });
}

async function Pagination(data, message, queryThread, messageMode){
  /**
   * @var {Object} page This var contains all necessary 
   * data to create a "book" of data
   * @var {array} threadListEmbed this array holds each page.
   * Each page is a RichEmbed
   **/
  let page = {
    upperBound: ITEM_PER_PAGE,
    lowerBound: 0,
    currentPage: 0,
    maxPage: Math.ceil(queryThread.responseData.length / ITEM_PER_PAGE) - 1
  };
  let threadListEmbed = new Array(page.maxPage);
  threadListEmbed[0] = new Discord.RichEmbed()
    .setColor('#301934')
    .setTitle(`All threads that start with ID: ${data.threadID}`);
  if(messageMode)
  {
    threadListEmbed[0].addField('Add more digits to ID', `${data.threadID}`);
    threadListEmbed[0].addBlankField();
  }
  queryThread.responseData
    .slice(page.lowerBound, page.upperBound).forEach((thread, index) => {
      let currentIndex = page.currentPage * ITEM_PER_PAGE + index + 1;
      threadListEmbed[page.currentPage]
        .addField(`${currentIndex}. Thread ID: ${thread.threadID}`, `topic: ${thread.topic}`);
    });
  if(page.maxPage)  
    threadListEmbed[page.currentPage]
      .setFooter(`Page: ${page.currentPage+1}/${page.maxPage+1}`);
  let currentMsg = await message.channel
    .send(threadListEmbed[page.currentPage]);
  // if more than 1 maxPage then allow mult page
  if(page.maxPage)
    await currentMsg.react('⬅️');
  await currentMsg.react('⏹️');
  if(page.maxPage)
    await currentMsg.react('➡️'); 
  //  Initialize Reaction Collector
  let filter = (reaction, user) => {
    return (
      ['⬅️', '⏹️', '➡️'].includes(reaction.emoji.name) &&
        user.id === message.author.id
    );
  };
  const emojiCollector = currentMsg
    .createReactionCollector(filter, { time: 300000 });
  const checkEmoji = async reaction => {      
    /**
     *  Handles what the current page is and 
     *  what the range of threads we want is
     **/  
    switch (reaction.emoji.name) {
      case '➡️':   
        if(page.currentPage < page.maxPage)
          page.currentPage++;
        else 
          page.currentPage = 0;
        break;
      case '⬅️':   
        if(page.currentPage > 0)
          page.currentPage--;
        else
          page.currentPage = page.maxPage;
        break;
      case '⏹️':  
        emojiCollector.stop(['The user has chosen a new threadID']);
        return;
    }
    page.lowerBound = page.currentPage * ITEM_PER_PAGE;
    page.upperBound = ITEM_PER_PAGE + (page.currentPage * ITEM_PER_PAGE);
    //  making the new page if the page hasnt been already made
    if(threadListEmbed[page.currentPage] === undefined)
    {
      threadListEmbed[page.currentPage] = new Discord.RichEmbed()
        .setColor('#301934')
        .setTitle(`All threads that start with ID: ${data.threadID}`);
      if(messageMode)
      {
        threadListEmbed[page.currentPage]
          .addField('Add more digits to ID', `${data.threadID}`);
        threadListEmbed[page.currentPage]
          .addBlankField();
      }
      queryThread.responseData
        .slice(page.lowerBound, page.upperBound).forEach((thread, index)  => {
          let currentIndex = page.currentPage * ITEM_PER_PAGE + index + 1;
          threadListEmbed[page.currentPage]
            .addField(`${currentIndex}. Thread ID: ${thread.threadID}`, `topic: ${thread.topic}`);
        });
      threadListEmbed[page.currentPage]
        .setFooter(`Page: ${page.currentPage+1}/${page.maxPage+1}`);
    }
    currentMsg
      .edit(threadListEmbed[page.currentPage])
      .catch();
    await reaction.remove(reaction.users.last().id);
  };
    // turn on the collector
  emojiCollector.on('collect', checkEmoji);
  emojiCollector.on('end', async () => { 
    currentMsg.delete();
  });
  return emojiCollector;
}
