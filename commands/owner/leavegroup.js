/**
 * Leave Group Command
 */

module.exports = {
  name: 'leavegroup',
  aliases: ['leave', 'lg'],
  category: 'owner',
  description: 'Bot kutoka kwenye group',
  usage: '.leavegroup',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!extra.isGroup) {
        return extra.reply('❌ Command hii inatumika kwenye group tu!');
      }

      await extra.reply('👋 Kwa heri! Bot inaondoka kwenye group hii...');
      await sock.groupLeave(extra.from);

    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
