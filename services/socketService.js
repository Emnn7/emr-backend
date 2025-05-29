const socketio = require('socket.io');
const Notification = require('../models/Notification');

let io;

exports.init = (server) => {
  io = socketio(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected');

    // Join room for user-specific notifications
    socket.on('join', async (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);

      // Send any unread notifications
      const notifications = await Notification.find({
        user: userId,
        read: false
      }).sort('-createdAt');
      
      if (notifications.length > 0) {
        socket.emit('notifications', notifications);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  return io;
};

exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

exports.sendNotification = async (userId, message, type, relatedEntity = null) => {
  try {
    const notification = await Notification.create({
      user: userId,
      message,
      type,
      relatedEntity
    });

    // Send to specific user room
    io.to(userId.toString()).emit('notification', notification);
    return notification;
  } catch (err) {
    console.error('Error sending notification:', err);
  }
};

exports.markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        user: userId
      },
      { read: true },
      { new: true }
    );

    if (notification) {
      // Update user's notification list
      io.to(userId.toString()).emit('notification-read', notificationId);
    }

    return notification;
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
};