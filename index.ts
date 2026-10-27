import { registerRootComponent } from 'expo';

// Fon geolokatsiya vazifasi ilova ishga tushishidan oldin e'lon qilinishi shart
import './src/lib/tracking';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
