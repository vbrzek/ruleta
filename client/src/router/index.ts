import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/lobby/:code', component: () => import('../views/LobbyView.vue') },
    { path: '/game/:code', component: () => import('../views/GameView.vue') },
    { path: '/join/:code', component: () => import('../views/JoinView.vue') },
  ],
})

export default router
