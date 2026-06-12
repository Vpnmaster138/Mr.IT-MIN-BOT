/**
 * Auto-Read Command
 */
const config = require('../../config');

module.exports = {
  name: 'autoread',
  aliases: ['aread'],
  category: 'owner',
  description: 'Auto read all messages',
  usage: '.autoread <on/off>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) {
        const status = config.autoRead ? 'ON ✅' : 'OFF ❌';
        return extra.reply(`📖 *Auto Read Messages*\n\nCurrent: *${status}*\n\nUsage:\n• .autoread on\n• .autoread off`);
      }

      const opt = args[0].toLowerCase();

      if (opt === 'on') {
        config.autoRead = true;
        return extra.reply('✅ Auto Read: *ON*\nBot itasoma messages zote automatically!');
      }

      if (opt === 'off') {
        config.autoRead = false;
        return extra.reply('❌ Auto Read: *OFF*');
      }

      extra.reply('❌ Tumia: .autoread on / .autoread off');
    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
