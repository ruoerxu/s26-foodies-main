import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: "./" so assets resolve when deployed to /data/web/.../cse-442aj/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/src/login.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/login.php',
      },
      '/src/logout.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/logout.php',
      },
      '/src/profile.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/profile.php',
      },
      '/src/get_user_profile_full.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/get_user_profile_full.php',
      },
      '/src/upload_avatar.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/upload_avatar.php',
      },
      '/src/delete_avatar.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/delete_avatar.php',
      },
      '/src/change_password.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/change_password.php',
      },
      '/src/list_friends.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/foodies' + path,
      },
      '/src/search_users.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/foodies' + path,
      },
      '/src/uploads/avatars': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/foodies' + path,
      },
      '/src/list_friend_requests.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/foodies' + path,
      },
      '/src/create_party.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/create_party.php',
      },
      '/src/get_parties.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/get_parties.php',
      },
      '/src/delete_party.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: () => '/foodies/src/delete_party.php',
      },
    },
  },
})
