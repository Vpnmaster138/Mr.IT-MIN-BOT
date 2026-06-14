/**
 * Song Downloader - Download audio from YouTube
 * Uses reliable third-party APIs
 */

const yts = require('yt-search');
const axios = require('axios');
const { toAudio } = require('../../utils/converter');

module.exports = {
  name: 'song',
  aliases: ['play', 'music', 'yta'],
  category: 'media',
  description: 'Download audio from YouTube',
  usage: '.song <song name or YouTube link>',

  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    try {
      const text = args.join(' ');
      if (!text) {
        return await sock.sendMessage(chatId, {
          text: '🎵 Tumia: .song <jina la wimbo au YouTube link>\n\nMfano: .song Fally Ipupa Eloko Pyá'
        }, { quoted: msg });
      }

      // Tafuta video YouTube
      let video;
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        const id = text.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
        const search = await yts({ videoId: id });
        video = search;
        video.url = text;
      } else {
        const search = await yts(text);
        if (!search?.videos?.length) {
          return await sock.sendMessage(chatId, {
            text: '❌ Wimbo haukupatikana. Jaribu jina tofauti.'
          }, { quoted: msg });
        }
        video = search.videos[0];
      }

      // Notify user
      await sock.sendMessage(chatId, {
        text: `⏳ Inadownload...\n\n🎵 *${video.title}*\n⏱️ ${video.timestamp || ''}`
      }, { quoted: msg });

      const videoUrl = video.url;
      let audioBuffer = null;

      // ── API 1: y2mate via rapidapi ──
      try {
        const res1 = await axios.post(
          'https://youtube-mp3-downloader2.p.rapidapi.com/ytmp3/ytmp3/',
          { url: videoUrl },
          {
            headers: {
              'content-type': 'application/json',
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
              'X-RapidAPI-Host': 'youtube-mp3-downloader2.p.rapidapi.com'
            },
            timeout: 30000
          }
        );
        const dlUrl = res1.data?.link || res1.data?.dlink;
        if (dlUrl) {
          const r = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
          if (r.data && r.data.byteLength > 0) audioBuffer = Buffer.from(r.data);
        }
      } catch (e) {}

      // ── API 2: cobalt.tools (free, no key needed) ──
      if (!audioBuffer) {
        try {
          const res2 = await axios.post(
            'https://api.cobalt.tools/api/json',
            {
              url: videoUrl,
              vCodec: 'h264',
              aFormat: 'mp3',
              isAudioOnly: true
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              timeout: 30000
            }
          );
          const dlUrl = res2.data?.url;
          if (dlUrl) {
            const r = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            if (r.data && r.data.byteLength > 0) audioBuffer = Buffer.from(r.data);
          }
        } catch (e) {}
      }

      // ── API 3: yt-dlp via loader.to ──
      if (!audioBuffer) {
        try {
          const res3 = await axios.get(
            `https://loader.to/api/button/?url=${encodeURIComponent(videoUrl)}&f=mp3`,
            { timeout: 20000 }
          );
          const dlUrl = res3.data?.url;
          if (dlUrl) {
            // Poll kwa download link
            for (let i = 0; i < 5; i++) {
              await new Promise(r => setTimeout(r, 3000));
              const check = await axios.get(
                `https://loader.to/api/info/?url=${encodeURIComponent(videoUrl)}&f=mp3`,
                { timeout: 15000 }
              );
              if (check.data?.download_url) {
                const r = await axios.get(check.data.download_url, {
                  responseType: 'arraybuffer',
                  timeout: 60000
                });
                if (r.data && r.data.byteLength > 0) {
                  audioBuffer = Buffer.from(r.data);
                  break;
                }
              }
            }
          }
        } catch (e) {}
      }

      // ── API 4: zylalabs via rapidapi ──
      if (!audioBuffer) {
        try {
          const res4 = await axios.get(
            `https://youtube-to-mp315.p.rapidapi.com/mp3?url=${encodeURIComponent(videoUrl)}`,
            {
              headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
                'X-RapidAPI-Host': 'youtube-to-mp315.p.rapidapi.com'
              },
              timeout: 30000
            }
          );
          const dlUrl = res4.data?.link || res4.data?.url;
          if (dlUrl) {
            const r = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            if (r.data && r.data.byteLength > 0) audioBuffer = Buffer.from(r.data);
          }
        } catch (e) {}
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ Imeshindwa kudownload wimbo huu.\n\nSababu zinazowezekana:\n• Wimbo umezuiwa kikanda\n• YouTube imebadilisha rules\n\nJaribu wimbo mwingine au baadaye.'
        }, { quoted: msg });
      }

      // Detect format na convert kama lazima
      let finalBuffer = audioBuffer;
      const sig = audioBuffer.slice(4, 8).toString('ascii');
      const isM4A = sig === 'ftyp' || audioBuffer.toString('ascii', 0, 4) === 'ftyp';
      const isOGG = audioBuffer.toString('ascii', 0, 4) === 'OggS';
      const isWAV = audioBuffer.toString('ascii', 0, 4) === 'RIFF';

      if (isM4A) {
        finalBuffer = await toAudio(audioBuffer, 'm4a');
      } else if (isOGG) {
        finalBuffer = await toAudio(audioBuffer, 'ogg');
      } else if (isWAV) {
        finalBuffer = await toAudio(audioBuffer, 'wav');
      }

      // Tuma audio
      const title = (video.title || 'song').replace(/[^\w\s-]/g, '').trim();
      await sock.sendMessage(chatId, {
        audio: finalBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: msg });

    } catch (err) {
      console.error('Song command error:', err);
      await sock.sendMessage(chatId, {
        text: '❌ Hitilafu imetokea. Jaribu tena baadaye.'
      }, { quoted: msg });
    }
  }
};
