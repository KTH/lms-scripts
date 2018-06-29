module.exports = function getQueue() {
  return {
    send(message) {
      console.log('Message about to be sent', message)

      console.log('Message sent')
    }
  }
}
