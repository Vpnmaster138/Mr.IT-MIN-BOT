/**
 * Auto-Reply Command
 */
const config = require('../../config');

module.exports = {
  name: 'autoreply',
  aliases: ['areply'],
  category: 'owner',
  description: 'Auto reply to messages',
  usage: '.autoreply <on/off/set <message>>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) {
        const status = config.autoReply ? 'ON ✅' : 'OFF ❌';
        return extra.reply(
          `💬 *Auto Reply*\n\n` +
          `Current: *${status}*\n` +
          `Message: _${config.autoReplyMessage || 'Sijaweka message bado'}_\n\n` +
          `Usage:\n` +
          `• .autoreply on\n` +
          `• .autoreply off\n` +
          `• .autoreply set Hujambo! Bot iko busy sasa`
        );
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        config.autoReply = true;
        return extra.reply('✅ Auto Reply: *ON*');
      }

      if (opt === 'off') {
        config.autoReply = false;
        return extra.reply('❌ Auto Reply: *OFF*');
      }

      if (opt === 'set') {
        const replyMsg = args.slice(1).join(' ');
        if (!replyMsg) return extra.reply('❌ Weka message: .autoreply set <message>');
        config.autoReplyMessage = replyMsg;
        return extra.reply(`✅ Auto Reply message imewekwa:\n_${replyMsg}_`);
      }

      extra.reply('❌ Tumia: .autoreply on / off / set <message>');
    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
