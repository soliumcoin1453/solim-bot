// Bağımlılıkları yükle
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
require('dotenv').config();

// Express ve bot ayarları
const app = express();
app.use(express.json()); // Webhook için JSON isteklerini işle

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

// Heroku app URL'si ve webhook ayarı
const webhookUrl = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/bot${token}`;
bot.setWebHook(webhookUrl).then(() => {
  console.log(`Webhook ayarlandı: ${webhookUrl}`);
});

// Ham içerik (content) - Geçici olarak kodda tutuyoruz
const contentPool = [
  'Solium Coin presale başlıyor! Helal finansla geleceği inşa ediyoruz.',
  'Dubai’den dünyaya helal finans devrimi! Solium Coin’le tanış.',
  'Etik yatırım mı arıyorsun? Solium Coin tam sana göre!',
  'Presale fırsatını kaçırma! Solium Coin’le kazan.',
];

// Grok API'den içerik alma (Placeholder)
async function getGrokContent(prompt) {
  try {
    // Gerçek API key'in olunca burayı güncelle
    const response = await axios.post(
      'https://api.x.ai/grok',
      { prompt: prompt + ' Samimi bir tonda, helal finans vurgusu yap, #SoliumCoin ekle.' },
      { headers: { Authorization: `Bearer ${process.env.GROK_API_KEY}` } }
    );
    return response.data.content || contentPool[Math.floor(Math.random() * contentPool.length)];
  } catch (error) {
    console.error('Grok API hatası:', error.message);
    // Hata durumunda ham içerikten rastgele seç
    return contentPool[Math.floor(Math.random() * contentPool.length)];
  }
}

// 3 saatte bir otomatik paylaşım
setInterval(async () => {
  try {
    const content = await getGrokContent('Solium Coin için kısa, çarpıcı bir Telegram gönderisi yaz.');
    const message = `${content} 🚀 #SoliumCoin #HelalFinans\nDetaylar: soliumcoin.com`;
    await bot.sendMessage('@soliumcoin', message); // Kanalda paylaş
    console.log('Paylaşım yapıldı:', message);
  } catch (error) {
    console.error('Paylaşım hatası:', error.message);
  }
}, 3 * 60 * 60 * 1000); // 3 saat (10800000 ms)

// Webhook endpoint
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Komut: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Kanka, Solium Moon Bot’a hoş geldin! 🌙\nSolium Coin’le helal finans devrimine katıl!\nKomutlar için /help yaz.');
});

// Komut: /presale
bot.onText(/\/presale/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Solium Coin presale fırsatını kaçırma! 😎\nMetamask cüzdanını hazırla: soliumcoin.com');
});

// Komut: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Solium Moon Bot komutları:\n/start - Başla\n/presale - Presale detayları\n/help - Bu mesaj\n\nBotun mesajlarını alıntılayarak Grok’a soru sorabilirsin! 🚀');
});

// Alıntı mesajla Grok’u tetikleme
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  // Botun kendi mesajlarını ve komutları yoksay
  if (msg.from.id === bot.getMe().id || msg.text?.startsWith('/')) return;

  // Alıntı mesaj varsa ve botun mesajına yanıt ise
  if (msg.reply_to_message && msg.reply_to_message.from.id === (await bot.getMe()).id) {
    const userQuestion = msg.text || 'Sorun ne kanka?';
    try {
      const grokResponse = await getGrokContent(`Kullanıcı şunu sordu: "${userQuestion}". Solium Coin odaklı, samimi bir cevap ver.`);
      const reply = `Kanka, işte cevabın: ${grokResponse} 😎\n#SoliumCoin #HelalFinans`;
      await bot.sendMessage(chatId, reply, { reply_to_message_id: msg.message_id });
      console.log(`Grok cevabı gönderildi: ${reply}`);
    } catch (error) {
      console.error('Grok tetikleme hatası:', error.message);
      await bot.sendMessage(chatId, 'Ups, bir şeyler yanlış gitti! 😅 Tekrar dene.', { reply_to_message_id: msg.message_id });
    }
  }
});

// Express sunucusunu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot sunucusu ${PORT} portunda çalışıyor...`);
});
