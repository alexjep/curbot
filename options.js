module.exports = {
  options: {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          { text: 'currency', callback_data: 'currency' },
          { text: 'convert', callback_data: 'convert' }
        ]
      ]
    })
  }
}
