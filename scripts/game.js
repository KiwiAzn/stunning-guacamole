/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * 'AS IS' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

const isDevMode = process.env.NODE_ENV === "development";
const requirejs = require("requirejs");
const _ = require("lodash");
const roguelike = require("roguelike/level/roguelike");

const playerSpeed = 100;

const nameBadgeStyle = {
  fontSize: 16,
  font: "Arial",
  fill: "#ffffff",
  align: "center"
};

// Setting up phaser
window.PIXI = require("phaser/build/custom/pixi");
window.p2 = require("phaser/build/custom/p2");
window.Phaser = require("phaser/build/custom/phaser-split");

requirejs.config({
  nodeRequire: require,
  baseUrl: __dirname
});

// Start the main app logic.
requirejs(["happyfuntimes", "hft-game-utils", "hft-sample-ui"], function(
  happyfuntimes,
  gameUtils,
  sampleUI
) {
  var GameServer = happyfuntimes.GameServer;
  var GameSupport = gameUtils.gameSupport;
  var Misc = sampleUI.misc;
  var PlayerNameManager = sampleUI.PlayerNameManager;

  let game = new Phaser.Game(1920, 1080, Phaser.AUTO, "playfield", {
    preload: preload,
    create: create,
    render: render,
    update: update
  });

  let graphics = null;

  let wallGroup = null;
  let floorGroup = null;
  let playerGroup = null;
  let doorGroup = null;
  let genericUndeadGroup = null;
  let uiGroup = null;

  let decorGroup = null;
  let goreEmitter = null;
  let bloodEmitter = null;

  let entrance = null;
  let exit = null;

  let genericUndeadIndex = _.range(14);

  function preload() {
    game.load.spritesheet(
      "players",
      "./assets/DawnLike/Characters/Player0.png",
      16,
      16
    );

    game.load.spritesheet(
      "walls",
      "./assets/DawnLike/Objects/Wall.png",
      16,
      16
    );

    game.load.spritesheet(
      "floors",
      "./assets/DawnLike/Objects/Floor.png",
      16,
      16
    );

    game.load.spritesheet(
      "tiles",
      "./assets/DawnLike/Objects/Tile.png",
      16,
      16
    );

    game.load.spritesheet(
      "doorsClosed",
      "./assets/DawnLike/Objects/Door0.png",
      16,
      16
    );

    game.load.spritesheet(
      "doorsOpen",
      "./assets/DawnLike/Objects/Door1.png",
      16,
      16
    );

    game.load.spritesheet(
      "undead0",
      "./assets/DawnLike/Characters/Undead0.png",
      16,
      16
    );

    game.load.spritesheet(
      "undead1",
      "./assets/DawnLike/Characters/Undead1.png",
      16,
      16
    );

    game.load.spritesheet("ammo", "./assets/DawnLike/Items/Ammo.png", 16, 16);

    game.load.spritesheet("gore", "./assets/DawnLike/Items/Flesh.png", 16, 16);

    game.load.spritesheet(
      "blood",
      "./assets/DawnLike/Objects/Ground0.png",
      16,
      16
    );
  }

  function create() {
    game.physics.startSystem(Phaser.Physics.ARCADE);

    graphics = game.add.graphics(0, 0);

    let levelGen = roguelike({
      width: 80,
      height: 45,
      retry: 100,
      special: true,
      room: {
        ideal: 100,
        min_width: 5,
        max_width: 13,
        min_height: 5,
        max_height: 13
      }
    });

    wallGroup = game.add.group();
    playerGroup = game.add.group();
    floorGroup = game.add.group();
    doorGroup = game.add.group();
    genericUndeadGroup = game.add.group();
    decorGroup = game.add.group();

    // Create gore emitter
    goreEmitter = game.add.emitter(0, 0, 500);

    goreEmitter.makeParticles(
      "gore",
      _.concat(_.range(0, 20), _.range(23, 26)),
      50,
      true
    );

    goreEmitter.gravity = 0;
    goreEmitter.minParticleSpeed.setTo(-100, -100);
    goreEmitter.maxParticleSpeed.setTo(100, 100);
    goreEmitter.minParticleScale = 1;
    goreEmitter.maxParticleScale = 1.5;
    goreEmitter.bounce.setTo(0.1, 0.1);
    goreEmitter.angularDrag = 250;
    goreEmitter.particleDrag.setTo(100, 100);

    bloodEmitter = game.add.emitter(0, 0, 1000);

    bloodEmitter.makeParticles("blood", [40, 41, 48, 49], 50, true);

    bloodEmitter.gravity = 0;
    bloodEmitter.minParticleSpeed.setTo(-100, -100);
    bloodEmitter.maxParticleSpeed.setTo(100, 100);
    bloodEmitter.minParticleScale = 1;
    bloodEmitter.maxParticleScale = 1.5;
    bloodEmitter.bounce.setTo(0.1, 0.1);
    bloodEmitter.angularDrag = 250;
    bloodEmitter.particleDrag.setTo(100, 100);
    bloodEmitter.setAlpha(0.3, 0.8);

    game.world.sendToBack(floorGroup);
    game.world.bringToTop(bloodEmitter);
    game.world.bringToTop(goreEmitter);
    game.world.bringToTop(genericUndeadGroup);
    game.world.bringToTop(playerGroup);
    game.world.bringToTop(wallGroup);
    game.world.bringToTop(doorGroup);

    wallGroup.enableBody = true;
    playerGroup.enableBody = true;
    doorGroup.enableBody = true;
    genericUndeadGroup.enableBody = true;

    // Setup level data
    _.each(levelGen.world, (column, y) => {
      _.each(column, (tile, x) => {
        switch (tile) {
          case 3:
          case 4:
          case 1:
            // Floor
            addFloorTile(levelGen.world, x, y);
            break;
          case 2:
            // Wall
            let wall = game.add.sprite(24, 24, "walls");
            wall.frame = getWallTile(levelGen.world, x, y);
            wall.y = y * 24;
            wall.x = x * 24;
            wall.scale.setTo(1.5, 1.5);
            wallGroup.add(wall);
            wall.body.immovable = true;
            wall.body.moves = false;
            wall.body.enable = true;
            break;
          case 5:
            addFloorTile(levelGen.world, x, y);
            entrance = game.add.sprite(24, 24, "tiles");
            entrance.y = y * 24;
            entrance.x = x * 24;
            entrance.scale.setTo(1.5, 1.5);
            entrance.frame = 5 + 24;
            break;
          case 6:
            addFloorTile(levelGen.world, x, y);
            exit = game.add.sprite(24, 24, "tiles");
            exit.y = y * 24;
            exit.x = x * 24;
            exit.scale.setTo(1.5, 1.5);
            exit.frame = 7 + 24;
            break;
          default:
            break;
        }
      });
    });

    wallGroup.cacheAsBitmap = true;
    floorGroup.cacheAsBitmap = true;

    // Setup doors
    _.each(levelGen.doors, door => {
      addDoor(levelGen.world, door);
    });

    // Create enemies
    // Iterate through each room
    _.each(levelGen.rooms, room => {
      // Spawn stuff not in the starting room
      if (!room.enter && !room.exit && !room.special) spawnMonsters(room);
    });
  }

  function spawnMonsters(room) {
    // Get amount of enemies to spawn
    let monsterCountMin = (room.width - 4) * (room.height - 4) / 5;
    let monsterCountMax = (room.width - 4) * (room.height - 4) / 4;

    if (monsterCountMin < 0) monsterCountMin = 0;
    if (monsterCountMax < 1) monsterCountMax = 1;

    let monsterCount = _.random(
      monsterCountMin.toFixed(0),
      monsterCountMax.toFixed(0)
    );

    for (let i = 0; i < monsterCount; i++) {
      let monster = game.add.sprite(24, 24, "undead0");
      monster.frame = _.sample(genericUndeadIndex);

      monster.x = (_.random(room.width - 4) + room.left + 2) * 24;
      monster.y = (_.random(room.height - 4) + room.top + 2) * 24;

      monster.scale.setTo(1.5, 1.5);

      monster.swapFrame = _.random(30, 60);

      monster.health = _.random(5, 10);

      genericUndeadGroup.add(monster);

      monster.body.mass = 100;
      monster.body.drag = 10000;
      monster.body.maxVelocity = new Phaser.Point(16, 16);
    }
  }

  function addFloorTile(world, x, y) {
    let floor = game.add.sprite(24, 24, "floors");
    floor.frame = getFloorTile(world, x, y);
    floor.y = y * 24;
    floor.x = x * 24;
    floor.scale.setTo(1.5, 1.5);
    floorGroup.add(floor);
  }

  function addDoor(world, doorData) {
    let door = game.add.sprite(24, 24, "doorsClosed");
    door.data = doorData;
    let x = doorData.x;
    let y = doorData.y;
    let doorIndex = 0;
    // top
    if (y - 1 > 0) {
      if (world[y - 1][x] === 2) {
        doorIndex = 1;
      }
    } else if (y + 1 < world.length) {
      if (world[y + 1][x] === 2) {
        doorIndex = 1;
      }
    }

    let doorOffset = 0;

    if (doorData.exit) doorOffset = 4;

    if (doorData.special) doorOffset = 2;

    door.frame = doorIndex + doorOffset;
    door.scale.set(1.5, 1.5);
    door.y = y * 24;
    door.x = x * 24;
    doorGroup.add(door);
    door.body.immovable = true;
    door.body.moves = false;
    door.body.enable = true;
  }

  function getFloorTile(world, x, y) {
    let marchingTile = 0;
    let rowOffset = 21;
    // Floor Sprite sheet is 21x39 (336px x 624px)
    // left
    if (x - 1 > 0) {
      if (world[y][x - 1] === 2) {
        marchingTile += 1;
      }
    }
    // right
    if (x + 1 < world[0].length) {
      if (world[y][x + 1] === 2) {
        marchingTile += 2;
      }
    }
    // top
    if (y - 1 > 0) {
      if (world[y - 1][x] === 2) {
        marchingTile += 4;
      }
    }
    // bottom
    if (y + 1 < world.length) {
      if (world[y + 1][x] === 2) {
        marchingTile += 8;
      }
    }

    // Map marching tile to sprite
    let wallMap = [
      1 + rowOffset * 1, // None
      0 + rowOffset * 1, // L
      2 + rowOffset * 1, // R
      3 + rowOffset * 1, // LR
      1, // T 4
      0, // TR
      2,
      3,
      1 + rowOffset * 2, // 8
      0 + rowOffset * 2,
      2 + rowOffset * 2,
      3 + rowOffset * 2,
      5 + rowOffset * 1,
      4 + rowOffset * 1,
      6 + rowOffset * 1,
      5
    ];

    return wallMap[marchingTile] + rowOffset * 3;
  }

  // Figures out which tiles to use according to the surronding walls
  function getWallTile(world, x, y) {
    let marchingTile = 0;
    // Wall Sprite sheet is 20x51 (320px x 816px)
    // left
    if (x - 1 > 0) {
      if (world[y][x - 1] === 2) {
        marchingTile += 1;
      }
    }
    // right
    if (x + 1 < world[0].length) {
      if (world[y][x + 1] === 2) {
        marchingTile += 2;
      }
    }
    // top
    if (y - 1 > 0) {
      if (world[y - 1][x] === 2) {
        marchingTile += 4;
      }
    }
    // bottom
    if (y + 1 < world.length) {
      if (world[y + 1][x] === 2) {
        marchingTile += 8;
      }
    }

    let rowOffset = 20;
    // Map marching tile to sprite
    let wallMap = [
      2 + rowOffset * 1,
      1,
      1,
      1,
      1 + rowOffset * 1,
      2 + rowOffset * 2,
      0 + rowOffset * 2,
      4 + rowOffset * 2,
      0 + rowOffset * 1,
      2,
      0,
      4,
      0 + rowOffset * 1,
      5 + rowOffset * 1,
      3 + rowOffset * 1,
      4 + rowOffset * 1
    ];

    return wallMap[marchingTile] + rowOffset * 3;
  }

  function render() {
    _.each(players, player => {
      if (player.nameBadge) {
        player.nameBadge.x = player.sprite.x + player.sprite.width / 2;
        player.nameBadge.y = player.sprite.y - player.sprite.height / 2;
      }
    });

    genericUndeadGroup.forEach(undead => {
      if (undead.swapFrame == 0) {
        if (undead.key === "undead0") {
          undead.loadTexture("undead1", undead.frame, false);
        } else {
          undead.loadTexture("undead0", undead.frame, false);
        }
        undead.swapFrame = _.random(30, 60);
      }
      undead.swapFrame--;
    });
  }

  var players = [];
  var globals = {
    itemSize: 15
  };
  Misc.applyUrlSettings(globals);

  var Player = function(netPlayer, name) {
    this.netPlayer = netPlayer;
    this.name = name;
    this.color = 0x00ff00;

    netPlayer.addEventListener(
      "disconnect",
      Player.prototype.disconnect.bind(this)
    );
    netPlayer.addEventListener("move", Player.prototype.movePlayer.bind(this));
    netPlayer.addEventListener("color", Player.prototype.setColor.bind(this));
    netPlayer.addEventListener("fire", Player.prototype.fire.bind(this));

    this.playerNameManager = new PlayerNameManager(netPlayer);
    this.playerNameManager.on(
      "setName",
      Player.prototype.handleNameMsg.bind(this)
    );
    // Adding player sprite
    this.sprite = game.add.sprite(16, 16, "players");
    this.sprite.scale.setTo(1.5, 1.5);

    this.sprite.frame = 0;

    this.sprite.x = entrance.x;
    this.sprite.y = entrance.y;

    playerGroup.add(this.sprite);
    game.physics.arcade.enable([this.sprite]);
    this.sprite.body.setSize(8, 8, 4, 4);

    // Adding weapon
    this.weapon = game.add.weapon(20, "ammo");

    this.weapon.bulletAngleOffset = 225;
    this.weapon.bulletAngleVariance = 5;

    this.weapon.bulletSpeed = 300;
    this.weapon.fireRate = 120;

    this.weapon.trackSprite(
      this.sprite,
      this.sprite.width / 2,
      this.sprite.height / 2
    );
  };

  Player.prototype.fire = function(cmd) {
    switch (cmd.direction) {
      case "left":
        this.weapon.fireAngle = 180;
        break;
      case "right":
        this.weapon.fireAngle = 0;
        break;
      case "up":
        this.weapon.fireAngle = 270;
        break;
      case "down":
        this.weapon.fireAngle = 90;
    }

    this.weapon.fire();

    this.weapon.bullets.forEach(bullet => {
      bullet.frame = 16;
    });
  };

  // The player disconnected
  Player.prototype.disconnect = function() {
    for (var ii = 0; ii < players.length; ++ii) {
      var player = players[ii];
      if (player === this) {
        player.nameBadge.destroy();
        player.sprite.destroy();
        players.splice(ii, 1);
        return;
      }
    }
  };

  Player.prototype.movePlayer = function(cmd) {
    this.sprite.body.velocity.x = cmd.x * playerSpeed;
    this.sprite.body.velocity.y = cmd.y * playerSpeed;
  };

  Player.prototype.handleNameMsg = function(name) {
    this.name = name;
    // Adding

    if (this.nameBadge) {
      this.nameBadge.text.setText(this.name);
    } else {
      this.nameBadge = game.add.graphics(0, 0);

      let text = game.add.text(0, 0, this.name, nameBadgeStyle);

      text.anchor.set(0.5, 0.5);

      this.nameBadge.beginFill(0x000000, 0.4);

      this.nameBadge.drawRect(
        -text.width / 2 - 2,
        -text.height / 2 - 2,
        text.width + 4,
        text.height
      );

      this.nameBadge.text = this.nameBadge.addChild(text);
    }
  };

  Player.prototype.setColor = function(cmd) {
    this.color = cmd.color;
  };

  var server = new GameServer();
  GameSupport.init(server, globals);

  // A new player has arrived.
  server.addEventListener("playerconnect", function(netPlayer, name) {
    players.push(new Player(netPlayer, name));
  });

  function update() {
    // Collision between players and walls
    game.physics.arcade.collide(wallGroup, playerGroup);
    game.physics.arcade.collide(wallGroup, genericUndeadGroup);
    game.physics.arcade.collide(playerGroup, genericUndeadGroup);
    game.physics.arcade.collide(genericUndeadGroup, genericUndeadGroup);
    game.physics.arcade.collide(genericUndeadGroup, doorGroup);

    game.physics.arcade.collide(goreEmitter, wallGroup);
    game.physics.arcade.collide(goreEmitter, doorGroup);
    game.physics.arcade.collide(bloodEmitter, wallGroup);
    game.physics.arcade.collide(bloodEmitter, doorGroup);

    game.physics.arcade.collide(
      playerGroup,
      doorGroup,
      doorCollisionHandler,
      null,
      this
    );

    _.each(players, player => {
      game.physics.arcade.collide(
        player.weapon.bullets,
        wallGroup,
        bulletCollisionWall,
        null,
        this
      );

      game.physics.arcade.collide(
        player.weapon.bullets,
        doorGroup,
        bulletCollisionWall,
        null,
        this
      );

      game.physics.arcade.collide(
        player.weapon.bullets,
        genericUndeadGroup,
        bulletCollisionEnemy,
        null,
        this
      );
    });

    goreEmitter.forEach(handleStoppedParticle);

    bloodEmitter.forEach(handleStoppedParticle);
    //decorGroup.cacheAsBitmap = true;
  }

  function handleStoppedParticle(particle) {
    if (
      particle.visible &&
      particle.body.velocity.x == 0 &&
      particle.body.velocity.y == 0
    ) {
      particle.visible = false;
      decorGroup.cacheAsBitmap = false;

      let particleClone = game.add.sprite(
        particle.x,
        particle.y,
        particle.key,
        particle.frame
      );

      particleClone.angle = particle.angle;
      particleClone.scale.setTo(particle.scale.x, particle.scale.y);
      particleClone.alpha = particle.alpha;
      particleClone.anchor.x = 0.5;
      particleClone.anchor.y = 0.5;
      decorGroup.add(particleClone);      
    }
  }

  function doorCollisionHandler(player, door) {
    if (!door.data.special && !door.data.exit) {
      door.loadTexture("doorsOpen", door.frame, false);
      game.camera.shake(0.005, 60);
      door.body.enable = false;
    }
  }

  function bulletCollisionWall(bullet, wall) {
    bullet.kill();
  }

  function bulletCollisionEnemy(bullet, enemy) {
    bullet.kill();

    enemy.health--;

    if (enemy.health == 0) {
      game.camera.shake(0.005, 60);
      goreEmitter.x = enemy.x + enemy.width / 2;
      goreEmitter.y = enemy.y + enemy.height / 2;
      goreEmitter.start(true, 1000, null, _.random(1, 3));

      bloodEmitter.x = enemy.x + enemy.width / 2;
      bloodEmitter.y = enemy.y + enemy.height / 2;
      bloodEmitter.start(true, 1000, null, _.random(2, 3));
      console.log(goreEmitter.children.length);
      enemy.destroy();
    } else {
      bloodEmitter.x = enemy.x + enemy.width / 2;
      bloodEmitter.y = enemy.y + enemy.height / 2;
      bloodEmitter.start(true, 1000, null, _.random(1, 2));
      console.log(bloodEmitter.children.length);
      game.camera.shake(0.002, 60);
    }
  }
});
