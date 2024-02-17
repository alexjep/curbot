const TelegramApi = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const token = '6956492176:AAE2U3iAc5Cjqt8W9ddERml-56k04N830yE';
const bot = new TelegramApi(token, {polling: true});

const options = {
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        { text: 'currency', callback_data: 'currency' },
        { text: 'convert', callback_data: 'convert' }
      ]
    ]
  })
}

// Глобальная переменная для хранения кэшированных данных
let cachedCurrencyData;
let lastFetchTime;

// Создание обработчика события message
bot.on('message', handleMessage);
// Создание обработчика события callback_query
bot.on('callback_query', handleCallbackQuery);

async function getCurrencies() {
  // Если кэшированные данные существуют и время их последнего обновления не превышает 1 часа, вернуть их
  if (cachedCurrencyData && (Date.now() - lastFetchTime < 3600000)) {
    return cachedCurrencyData;
  }

  try {
    const response = await fetch('https://www.cbr-xml-daily.ru/latest.js');
    if (!response.ok) {
      throw new Error('Failed to fetch currency data: ' + response.status);
    }
    const data = await response.json();
    // Обновляем кэшированные данные и время последнего обновления
    cachedCurrencyData = data.rates;
    lastFetchTime = Date.now();
    return cachedCurrencyData;
  } catch (error) {
    console.error('Failed to fetch currency data:', error);
    throw error; // Пробрасываем ошибку дальше, чтобы обработать её в вызывающем коде
  }
};

function start() {
  bot.setMyCommands([
    { command: '/start', description: 'Greeting' },
  ])
}
// Обработка сообщения
function handleMessage(msg) {
  try {
    const chatId = msg.chat.id;
    if (msg.text === '/start') {
      bot.sendMessage(chatId, 'Select options:', options);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    bot.sendMessage(msg.message.chat.id, 'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз позже.');
  }
}

async function handleCallbackQuery(msg) {
  // Обработка callback_query
  const chatId = msg.message.chat.id;

  try {
    let currencyData;
    // Проверяем, если есть кэшированные данные и они актуальны
    if (cachedCurrencyData && (Date.now() - lastFetchTime < 3600000)) {
      currencyData = cachedCurrencyData;
    } else {
      // Если кэшированных данных нет или они устарели, делаем новый запрос к API
      currencyData = await getCurrencies();
    }

    // Обработка callback_query и добавление сообщений в массив
    const data = msg.data;

    if (data === 'currency') {
      bot.sendMessage(chatId, `Курс: \

      RSD - ${(1 / currencyData.RSD).toFixed(2)} \

      EUR - ${(1 / currencyData.EUR).toFixed(2)} \

      USD - ${(1 / currencyData.USD).toFixed(2)} \

      TRY - ${(1 / currencyData.TRY).toFixed(2)}

      `);
    }

    if (data === 'convert') {
      bot.sendMessage(chatId, 'Enter the currency and the amount, e.g. USD 1000');
      bot.on('message', async (msg) => {
        // Разделяем сообщение на части, чтобы получить код валюты и сумму для преобразования
        const parts = msg.text.split(' ');

        if (parts.length !== 2) {
            return bot.sendMessage(chatId, 'Некорректный формат. Используйте формат [код валюты] [сумма], например USD 1000');
        }
        const currencyCode = parts[0];
        const amount = parseFloat(parts[1]);
        if (isNaN(amount)) {
            return bot.sendMessage(chatId, 'Некорректная сумма. Пожалуйста, введите число.');
        }
        try {
            // Получаем текущий курс выбранной валюты
            const currencyData = await getCurrencies();
            const targetRate = currencyData[currencyCode];

            if (!targetRate) {
                bot.sendMessage(chatId, 'Данные о курсе указанной валюты не найдены.');
            }
            // Преобразовываем сумму по курсу
            const convertedAmount = amount * targetRate;
            bot.sendMessage(chatId, `The sum of ${amount} RUB at the current exchange rate is ${convertedAmount.toFixed(2)} ${currencyCode}`);
        } catch (error) {
            console.error('Failed to fetch currency data:', error);
            bot.sendMessage(chatId, 'Ошибка при получении данных о курсах валют');
        }
      })
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз позже.');
  }
}

start();
