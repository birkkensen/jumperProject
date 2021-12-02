import Phaser from "phaser";
import StartScene from "./scenes/StartScene";
import GameScene from "./scenes/GameScene";
import Gameover from "./scenes/Gameover";
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: "arcade",
    arcade: {
    // debug: true,
    },
  },
  scene: [StartScene, GameScene, Gameover],
};
export default config;
