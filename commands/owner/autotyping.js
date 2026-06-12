/**
 * Auto-Typing Command
 */
const config = require('../../config');

module.exports = {
  name: 'autotyping',
  aliases: ['atyping'],
  category: 'owner',
  description: 'Show typing indicator when bot is processing',
  usage: '.autotyping <on/off>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) {
        const status = config.autoTyping ? 'ON ✅' : 'OFF ❌';
        return extra.reply(`⌨️ *Auto Typing*\n\nCurrent: *${status}*\n\nUsage:\n• .autotyping on\n• .autotyping off`);
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        config.autoTyping = true;
        return extra.reply('✅ Auto Typing: *ON*');
      }

      if (opt === 'off') {
        config.autoTyping = false;
        return extra.reply('❌ Auto Typing: *OFF*');
      }

      extra.reply('❌ Tumia: .autotyping on / .autotyping off');
    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
