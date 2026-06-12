/**
 * Auto-Like Status Command
 */
const config = require('../../config');

module.exports = {
  name: 'autolike',
  aliases: ['al'],
  category: 'owner',
  description: 'Auto like all status updates',
  usage: '.autolike <on/off>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) {
        const status = config.autoLikeStatus ? 'ON ✅' : 'OFF ❌';
        return extra.reply(`👍 *Auto Like Status*\n\nCurrent: *${status}*\n\nUsage:\n• .autolike on\n• .autolike off`);
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        config.autoLikeStatus = true;
        return extra.reply('✅ Auto Like Status: *ON*\nBot itapenda status zote automatically!');
      }

      if (opt === 'off') {
        config.autoLikeStatus = false;
        return extra.reply('❌ Auto Like Status: *OFF*');
      }

      extra.reply('❌ Tumia: .autolike on / .autolike off');
    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
