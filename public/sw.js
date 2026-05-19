// ContentOS Service Worker - 定时发布提醒
    self.addEventListener('install', () => self.skipWaiting())
    self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))

    self.addEventListener('message', (event) => {
      if (event.data?.type === 'SCHEDULE_REMINDER') {
        const { id, title, platform, time, minutesBefore } = event.data
        const publishTime = new Date(time).getTime()
        const reminderTime = publishTime - (minutesBefore || 30) * 60 * 1000
        const delay = reminderTime - Date.now()
        if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            self.registration.showNotification('📅 ContentOS 发布提醒', {
              body: `《${title}》将在 ${minutesBefore || 30} 分钟后发布到 ${platform}`,
              icon: '/icon-192.png',
              tag: `reminder-${id}`,
              data: { id, title, platform, time },
              actions: [{ action: 'view', title: '查看排期' }, { action: 'dismiss', title: '忽略' }],
              requireInteraction: true,
            })
          }, delay)
        }
      }
      if (event.data?.type === 'IMMEDIATE_REMINDER') {
        const { title, body } = event.data
        self.registration.showNotification('📅 ContentOS 提醒', {
          body: body || title,
          icon: '/icon-192.png',
          tag: 'immediate-reminder',
        })
      }
    })

    self.addEventListener('notificationclick', (event) => {
      event.notification.close()
      if (event.action !== 'dismiss') {
        event.waitUntil(
          clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
              if ('focus' in client) return client.focus()
            }
            if (clients.openWindow) return clients.openWindow('/')
          })
        )
      }
    })
    