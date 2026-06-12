/**
 * Unblock User Command
 */

module.exports = {
  name: 'unblock',
  aliases: ['ublk'],
  category: 'owner',
  description: 'Unblock mtumiaji',
  usage: '.unblock <number>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (!args[0]) return extra.reply('❌ Weka nambari: .unblock 255XXXXXXXXX');

      let num = args[0].replace(/[^0-9]/g, '');
      const target = num + '@s.whatsapp.net';

      await sock.updateBlockStatus(target, 'unblock');
      await extra.reply(`✅ *${num}* amefunguliwa (unblocked)!`);

    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
