const express = require('express');
const router = express.Router();

const subscriptions = [];

function buildPushPayload({ title, body, url }) {
  return JSON.stringify({
    title: title || 'Meta Creators Awards',
    body: body || 'Une mise à jour importante vient d’être publiée.',
    url: url || '/',
    tag: 'meta-creators-awards',
  });
}

router.post('/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, message: 'Abonnement invalide' });
  }

  const exists = subscriptions.some((item) => item.endpoint === subscription.endpoint);
  if (!exists) subscriptions.push(subscription);

  return res.json({ success: true, message: 'Abonnement enregistré' });
});

router.post('/notify', (req, res) => {
  const { title, body, url } = req.body || {};
  const payload = buildPushPayload({ title, body, url });

  Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${process.env.FCM_SERVER_KEY || ''}`,
        },
        body: JSON.stringify({
          to: subscription.endpoint,
          notification: { title, body, icon: '/icon-192x192.png' },
          data: { url: url || '/' },
        }),
      });
      return response.ok;
    })
  ).then(() => res.json({ success: true, count: subscriptions.length }));
});

router.post('/double-votes', (req, res) => {
  const { enabled, title, body, url } = req.body || {};

  if (enabled !== true) {
    return res.json({ success: true, message: 'Aucune notification envoyée : promo des votes doubles désactivée.' });
  }

  const payload = buildPushPayload({
    title: title || 'Votes doubles activés',
    body: body || 'La promo des votes doubles est maintenant active sur Meta Creators Awards.',
    url: url || '/',
  });

  Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${process.env.FCM_SERVER_KEY || ''}`,
        },
        body: JSON.stringify({
          to: subscription.endpoint,
          notification: { title: 'Votes doubles activés', body: 'La promo est ouverte !', icon: '/icon-192x192.png' },
          data: { url: url || '/', type: 'double-votes' },
        }),
      });
      return response.ok;
    })
  ).then(() => res.json({ success: true, count: subscriptions.length }));
});

module.exports = router;
