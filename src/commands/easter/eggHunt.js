const Command = require('../Command');
const {
  gatherEggID,
  displayEggs,
  createEgg,
} = require('../../util/eggHunt');
// const { isOfficer } = require('../../util/Permission');

module.exports = new Command({
  name: 'egghunt',
  description: 'Can you find the eggs.',
  aliases: ['egg'],
  example: 's!egghunt -------',
  permissions: 'general',
  category: 'easter',
  disabled: false,
  execute: (message, args) => {
    switch (args[0]) {
      case 'admin':
        // if(!isOfficer(message.author)) 
        // {
        //   message.channel("Not high enough rank sir.");
        //   return;
        // }
        switch (args[1]) {
          case 'start':
          case 'stop':
            gatherEggID(message, args[1]);
            break;

          case 'add':
            createEgg(message);
            break;

          default:
            message.channel
              .send('Valid options are: `start`, `stop`, `add`')
              .then(msg => msg.delete(20000).catch(() => {}));
            break;
        }
        break; // args[0] === 'admin'

      // args[0]
      case 'leaderboard':
      case 'eggs':
      case 'basket':
        displayEggs(message, args[1]);
        break;

      default:
        // todo: display help
        break;
    }
  },
});
