const { SystemError, UserInputError } = require('apollo-server');
const { GuildConfigTC, GuildConfig } = require('../models/guildConfig');
const { EasterEgg } = require('../models/easterEgg');

const GuildConfigQuery = {
  guildConfigOne: GuildConfigTC.mongooseResolvers.findOne(),
  guildConfigMany: GuildConfigTC.mongooseResolvers.findMany(),
  guildConfigCount: GuildConfigTC.mongooseResolvers.count(),
};

const GuildConfigMutation = {
  guildConfigCreateOne: GuildConfigTC.mongooseResolvers.createOne(),
  guildConfigUpdateOne: GuildConfigTC.mongooseResolvers.updateOne(),
  guildConfigRemoveOne: GuildConfigTC.mongooseResolvers.removeOne(),
  guildConfigRemoveMany: GuildConfigTC.mongooseResolvers.removeMany(),
  guildConfigAddEasterEggChannel: {
    type: GuildConfigTC,
    args: {
      guildID: 'String!',
      channelID: 'String!',
      eggID: 'String!',
      period: 'Int',
    },
    resolve: async (source, args) => {
      const { guildID, channelID, eggID, period } = args;

      const egg = await EasterEgg.findOne({ eggID });
      if (!egg) throw new UserInputError('Failed to find EasterEgg');

      const guildConfig = await GuildConfig.findOneAndUpdate(
        { guildID },
        {
          $addToSet: {
            'easter.eggChannels': {
              channelID,
              egg,
              period,
            },
          },
        },
        {
          new: true,
          useFindAndModify: false,
        }
      );
      if (!guildConfig) {
        throw new UserInputError('Failed to find and update GuildConfig');
      }

      return guildConfig;
    },
  },
};

module.exports = { GuildConfigQuery, GuildConfigMutation };