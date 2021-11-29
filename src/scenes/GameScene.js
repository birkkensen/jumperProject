import Phaser from "phaser";
import config from "../main.js";
let game, timerText, ball, healthbar1, healthbar2, healthbar3;
let score = 0;
let healthCounter = 3;
var overlapTriggered = false;
window.onload = function () {
  game = new Phaser.Game(config);
};

// let gamePoints = 0;

let gameOptions = {
  platformSpeedRange: [300, 300], //speed range in px/sec
  backgroundSpeed: 80, //backgroundspeed in px/sec
  platformSpawnRange: [80, 300], //how far should the next be platform from the right edge, before next platform spawns, in px
  platformSizeRange: [150, 300], //platform width range in px
  platformHeightRange: [-5, 5], //height range between rightmost platform and next platform to be spawned
  platformHeightScale: 20, //scale to be multiplied by platformHeightRange
  playerGravity: 1200,
  jumps: 2,
  jumpForce: 500,
  platformVerticalLimit: [0.4, 0.8],
  playerStartPosition: 200, //x position
  coinPercent: 50, // % of probability of coin appearing
  ballPercent: 25, // % of probability of spike appearing
};

class GameScene extends Phaser.Scene {
  constructor() {
    super({
      key: "GameScene",
    });
  }

  create() {
    this.center = {
      x: this.physics.world.bounds.width / 2,
      y: this.physics.world.bounds.height / 2,
    };
    this.addBackground();
    healthbar3 = this.add.image(this.center.x * 2 - 140, 20, "healthbar3");
    healthbar2 = this.add.image(this.center.x * 2 - 140, 20, "healthbar2");
    healthbar1 = this.add.image(this.center.x * 2 - 140, 20, "healthbar1");
    healthbar2.visible = false;
    healthbar1.visible = false;
    healthbar3.visible = false;
    // this.checkhealth();
    // setting player animation
    this.anims.create({
      key: "run",
      frames: this.anims.generateFrameNumbers("dude", {
        start: 0,
        end: 3,
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "jump",
      frames: [{ key: "dude", frame: 4 }],
    });

    this.anims.create({
      key: "rotate",
      frames: this.anims.generateFrameNumbers("coins", {
        start: 0,
        end: 7,
      }),
      frameRate: 20,
      repeat: -1,
    });

    // group with all active platforms.
    this.platformGroup = this.add.group({
      // once a platform is removed, it's added to the pool
      removeCallback: function (platform) {
        // @ts-ignore Property 'platformPool' does not exist on type 'Scene'.
        platform.scene.platformPool.add(platform);
      },
    });

    // platform pool
    this.platformPool = this.add.group({
      // once a platform is removed from the pool, it's added to the active platforms group
      removeCallback: function (platform) {
        // @ts-ignore Property 'platformGroup' does not exist on type 'Scene'.
        platform.scene.platformGroup.add(platform);
      },
    });

    //group all active coins
    this.coinGroup = this.add.group({
      removeCallback: function (coin) {
        //once a coin is removed it's added to the pool
        // @ts-ignore Property 'coinPool' does not exist on type 'Scene'.
        coin.scene.coinPool.add(coin);
      },
    });

    //coin pool
    this.coinPool = this.add.group({
      removeCallback: function (coin) {
        //once a coin is removed from the pool it's added to the active coins group
        // @ts-ignore Property 'coinGroup' does not exist on type 'Scene'.
        coin.scene.coinGroup.add(coin);
      },
    });

    //group all active bowling balls
    this.ballGroup = this.add.group({
      removeCallback: function (ball) {
        //once a ball is removed it's added to the pool
        // @ts-ignore Property 'ballPool' does not exist on type 'Scene'.
        ball.scene.ballPool.add(ball);
      },
    });

    //ball pool
    this.ballPool = this.add.group({
      removeCallback: function (ball) {
        // @ts-ignore Property 'ballGroup' does not exist on type 'Scene'.
        ball.scene.ballGroup.add(ball);
      },
    });

    // keeping track of added platforms
    this.addedPlatforms = 0;
    // number of consecutive jumps made by the player so far

    // Add jump on spacebar
    this.input.keyboard.on("keydown-" + "SPACE", this.jump, this);

    this.playerJumps = 0;
    this.dying = false;

    this.player = this.physics.add.sprite(
      gameOptions.playerStartPosition,
      game.config.height * 0.5,
      "dude"
    );
    this.player.setGravityY(gameOptions.playerGravity);
    this.player.setDepth(2);
    this.player.setScale(0.6);


    //setting collision between player and coins
    this.physics.add.overlap(
      this.player,
      this.coinGroup,
      function (player, coin) {
        if (overlapTriggered) {
          return;
        }
        overlapTriggered = true;
        this.updateScore();
        this.tweens.add({
          targets: coin,
          // @ts-ignore
          y: coin.y - 80,
          alpha: 0,
          duration: 800,
          ease: "Cubic.easeOut",
          callbackScope: this,
          onComplete: function () {
            this.coinGroup.killAndHide(coin);
            this.coinGroup.remove(coin);
            overlapTriggered = false;
          },
        });
      },
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.ballGroup,
      function (player, ball) {
        this.ballGroup.killAndHide(ball);
        this.ballGroup.remove(ball);
        this.checkHealth();
        healthCounter--;
        this.tweens.add({
          targets: player,
          alpha: 0,
          duration: 100,
          repeat: 3,
          yoyo: true,
          callbackScope: this,
          onComplete: function () {},
        });
      },
      null,
      this
    );

    // adding a platform to the game, the arguments are platform width, x position and y position
    this.addPlatform(
      game.config.width,
      game.config.width / 2,
      game.config.height * gameOptions.platformVerticalLimit[1]
    );
    // the player is not dying
    (this.dying = false),
      // checking for input
      // this.input.on("pointerdown", this.jump, this),
      // setting collisions between the player and the platform group
      (this.platformCollider = this.physics.add.collider(
        this.player,
        this.platformGroup,
        function () {
          // play "run" animation if the player is on a platform
          if (!this.player.anims.isPlaying) {
            this.player.anims.play("run");
          }
        },
        null,
        this
      ));

    // this.physics.add.collider(player, platform);
    timerText = this.add.text(10, 10, "Points: 0", {
      fontSize: "16px",
      color: "#000",
      fontFamily: "Arcade",
    });
    // timerText.setOrigin(0.5);
    //   this.time.addEvent({
    //     delay: 5000,
    //     callback: this.updateCounter,
    //     callbackScope: this,
    //     loop: true,
    //   });
  }
  addBackground() {
    this.anims.create({
      key: "background",
      frames: this.anims.generateFrameNames("bg", {
        start: 0,
        end: 6,
      }),
      frameRate: 12,
      repeat: -1,
    });
    this.bg = this.add.sprite(this.center.x, this.center.y, "bg");
    this.bg.anims.play("background");
    this.bg.setDisplaySize(this.center.x * 2 + 2, this.center.y * 2 + 2);
  }

  // the core of the script: platform are added from the pool or created on the fly
  /**
   * @param {number} platformWidth
   * @param {number} posX
   * @param {number} posY
   */
  addPlatform(platformWidth, posX, posY) {
    this.addedPlatforms++;
    let platform;
    if (this.platformPool.getLength()) {
      platform = this.platformPool.getFirst();

      platform.x = posX;
      platform.y = posY;
      platform.active = true;
      platform.visible = true;
      this.platformPool.remove(platform);
      platform.displayWidth = platformWidth;
      platform.tileScaleX = 1 / platform.scaleX;
    } else {
      platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform");
      this.physics.add.existing(platform);
      // @ts-ignore
      platform.body.setImmovable(true);
      // @ts-ignore
      platform.body.setVelocityX(
        Phaser.Math.Between(gameOptions.platformSpeedRange[0], gameOptions.platformSpeedRange[1]) *
          -1
      );
      platform.setDepth(2);
      this.platformGroup.add(platform);
    }
    this.nextPlatformDistance = Phaser.Math.Between(
      gameOptions.platformSpawnRange[0],
      gameOptions.platformSpawnRange[1]
    );

    //if this is not the starting platform?
    if (this.addedPlatforms > 1) {
      //if there is a coin over the platform?
      if (Phaser.Math.Between(1, 100) <= gameOptions.coinPercent) {
        if (this.coinPool.getLength()) {
          let coin = this.coinPool.getFirst();
          coin.x = posX;
          coin.y = posY - 96;
          coin.alpha = 1;
          coin.active = true;
          coin.visible = true;
          this.coinPool.remove(coin);
        } else {
          let coin = this.physics.add.sprite(posX, posY - 93, "coins");
          coin.setImmovable(true);
          coin.setVelocityX(platform.body.velocity.x);
          // coin.anims.play("rotate");
          coin.anims.play("rotate", true);
          coin.setDepth(2);
          this.coinGroup.add(coin);
        }
      }

      //if there is a ball over the platform?
      if (Phaser.Math.Between(1, 100) <= gameOptions.ballPercent) {
        if (this.ballPool.getLength()) {
          ball = this.ballPool.getFirst();
          ball.x = posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth);
          ball.y = posY - 52;
          ball.alpha = 1;
          ball.active = true;
          ball.visible = true;
          this.ballPool.remove(ball);
        } else {
          ball = this.physics.add.sprite(
            posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth),
            posY - 30,
            "ball"
          );
          ball.setImmovable(true);
          ball.setVelocityX(platform.body.velocity.x);
          // ball.setSize(8, 2);
          ball.setScale(0.15);
          //ball.anims.play create rotate animation
          ball.setDepth(2);
          this.ballGroup.add(ball);
        }
      }
    }
  }

  updateScore() {
    score++;
    timerText.setText("Points: " + score);
  }

  jump() {
    if (
      !this.dying &&
      (this.player.body.touching.down ||
        (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps))
    ) {
      if (this.player.body.touching.down) {
        this.playerJumps = 0;
      }
      this.player.setVelocityY(gameOptions.jumpForce * -1);
      this.playerJumps++;

      // stops animation
      this.player.anims.play("jump");
      this.player.anims.stop();
    }
  }

  update() {
    this.checkHealth();
    if (this.player.y > game.config.height) {
      this.gameover();
    }
    // Keep the player at the same position on the x axis
    this.player.x = gameOptions.playerStartPosition;
    // recycling platforms
    let minDistance = game.config.width;
    let rightmostPlatformHeight = 0;
    this.platformGroup.getChildren().forEach(function (platform) {
      // @ts-ignore Property 'x' && 'displawidth' does not exist on type 'GameObject'.
      let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
      if (platformDistance < minDistance) {
        minDistance = platformDistance;
        // @ts-ignore Property 'y' does not exist on type 'GameObject'.
        rightmostPlatformHeight = platform.y;
      }
      // @ts-ignore Property 'x' && 'displawidth' does not exist on type 'GameObject'.
      if (platform.x < -platform.displayWidth / 2) {
        this.platformGroup.killAndHide(platform);
        this.platformGroup.remove(platform);
      }
    }, this);

    // adding new platforms
    if (minDistance > this.nextPlatformDistance) {
      let nextPlatformWidth = Phaser.Math.Between(
        gameOptions.platformSizeRange[0],
        gameOptions.platformSizeRange[1]
      );
      let platformRandomHeight =
        gameOptions.platformHeightScale *
        Phaser.Math.Between(gameOptions.platformHeightRange[0], gameOptions.platformHeightRange[1]);
      let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;

      let minPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[0];
      let maxPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[1];
      let nextPlatformHeight = Phaser.Math.Clamp(
        nextPlatformGap,
        minPlatformHeight,
        maxPlatformHeight
      );
      this.addPlatform(
        nextPlatformWidth,
        game.config.width + nextPlatformWidth / 2,
        nextPlatformHeight
      );
    }

    // adding new coins
    this.coinGroup.getChildren().forEach(function (coin) {
      // @ts-ignore
      if (coin.x < -coin.displayWidth / 2) {
        this.coinGroup.killAndHide(coin);
        this.coinGroup.remove(coin);
      }
    }, this);

    // adding new bowling balls
    this.ballGroup.getChildren().forEach(function (ball) {
      // @ts-ignore
      if (ball.x < -ball.displayWidth / 2) {
        this.ballGroup.killAndHide(ball);
        this.ballGroup.remove(ball);
      }
    }, this);
  }

  checkHealth() {
    switch (healthCounter) {
      case 3:
        healthbar3.visible = true;
        healthbar2.visible = false;
        healthbar1.visible = false;
        break;
      case 2:
        healthbar3.visible = false;
        healthbar2.visible = true;
        healthbar1.visible = false;
        break;
      case 1:
        healthbar3.visible = false;
        healthbar2.visible = false;
        healthbar1.visible = true;
        break;
      case 0:
        this.gameover();
        break;
    }
  }

  gameover() {
    this.score = JSON.stringify(score);
    console.log(score);
    sessionStorage.setItem("Score", this.score);
    score = 0;
    healthCounter = 3;
    this.scene.start("Gameover");
  }
}

export default GameScene;
