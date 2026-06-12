/**
 * Block/Unblock User Command
 */

module.exports = {
  name: 'block',
  aliases: ['blk'],
  category: 'owner',
  description: 'Block mtumiaji',
  usage: '.block <number/@mention>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      let target;

      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        target = msg.message.extendedTextMessage.contextInfo.participant;
      } else if (args[0]) {
        let num = args[0].replace(/[^0-9]/g, '');
        target = num + '@s.whatsapp.net';
      } else {
        return extra.reply('❌ Mention mtu au weka nambari:\n.block 255XXXXXXXXX');
      }

      await sock.updateBlockStatus(target, 'block');
      await extra.reply(`✅ *${target.split('@')[0]}* amefungwa (blocked)!`);

    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
