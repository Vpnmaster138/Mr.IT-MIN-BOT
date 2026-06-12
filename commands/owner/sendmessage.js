/**
 * Send Message to specific number
 */

module.exports = {
  name: 'sendmessage',
  aliases: ['send', 'pm'],
  category: 'owner',
  description: 'Tuma message kwa nambari yoyote',
  usage: '.sendmessage <number> <message>',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      if (args.length < 2) {
        return extra.reply('❌ Tumia: .sendmessage <number> <message>\n\nMfano: .sendmessage 255623647378 Habari!');
      }

      let number = args[0].replace(/[^0-9]/g, '');
      const message = args.slice(1).join(' ');

      if (!number.includes('@')) {
        number = number + '@s.whatsapp.net';
      }

      await sock.sendMessage(number, { text: message });
      await extra.reply(`✅ Message imetumwa kwa *${args[0]}*`);

    } catch (err) {
      extra.reply(`❌ Error: ${err.message}`);
    }
  }
};
