import { createRouter, createWebHistory } from 'vue-router'

const Home = () => import('../pages/Home.vue')
const Gym = () => import('../pages/Gym.vue')
const City = () => import('../pages/City.vue')
const Inventory = () => import('../pages/Inventory.vue')
const Money = () => import('../pages/Money.vue')
const Casino = () => import('../pages/Casino.vue')
const Job = () => import('../pages/Job.vue')
const Stocks = () => import('../pages/Stocks.vue')
const Crimes = () => import('../pages/Crimes.vue')
const Property = () => import('../pages/Property.vue')
const Bank = () => import('../pages/Bank.vue')
const Profile = () => import('../pages/Profile.vue')
const HallOfFame = () => import('../pages/HallOfFame.vue')
const RealEstate = () => import('../pages/RealEstate.vue')
const Admin = () => import('../pages/Admin.vue')
const News = () => import('../pages/News.vue')

// Auth
const Login = () => import('../pages/auth/Login.vue')
const Register = () => import('../pages/auth/Register.vue')
const CreatePlayer = () => import('../pages/auth/CreatePlayer.vue')

const routes = [
  { path: '/auth/login', name: 'login', component: Login, meta: { public: true, hideChrome: true } },
  { path: '/auth/register', name: 'register', component: Register, meta: { public: true, hideChrome: true } },
  { path: '/auth/create-player', name: 'create-player', component: CreatePlayer, meta: { hideChrome: true } },

  { path: '/', name: 'home', component: Home },
  { path: '/gym', name: 'gym', component: Gym },
  { path: '/city', name: 'city', component: City },
  { path: '/inventory', name: 'inventory', component: Inventory },
  { path: '/money', name: 'money', component: Money },
  { path: '/casino', name: 'casino', component: Casino },
  { path: '/job', name: 'job', component: Job },
  { path: '/stocks', name: 'stocks', component: Stocks },
  { path: '/crimes', name: 'crimes', component: Crimes },
  { path: '/property', name: 'property', component: Property },
  { path: '/bank', name: 'bank', component: Bank },
  { path: '/profile', name: 'profile', component: Profile },
  { path: '/profile/:id', name: 'profile-id', component: Profile },
  { path: '/hall-of-fame', name: 'hall-of-fame', component: HallOfFame },
  { path: '/real-estate', name: 'real-estate', component: RealEstate },
  { path: '/admin', name: 'admin', component: Admin },
  { path: '/news', name: 'news', component: News },


]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta?.public) return true
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nc_token') : null
  if (!token) return { name: 'login', query: { next: to.fullPath } }
  return true
})

export default router
