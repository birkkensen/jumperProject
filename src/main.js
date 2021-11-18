import Phaser from "phaser";

import GameScene from "./scenes/GameScene";

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 900 },
        },
    },
    scene: [GameScene],
};
var image;
var text;
var timedEvent;

export default new Phaser.Game(config);