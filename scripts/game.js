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
    render: render
  });

  let graphics = null;

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
  }

  function create() {
    console.log("asdf");
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

    // Setup level data
    let level = {
      walls: _.each(levelGen.world, (column, y) => {
        _.each(column, (tile, x) => {
          switch (tile) {
            case 1:
              // Floor
              let floor = game.add.sprite(24, 24, "floors");
              floor.frame = 0;
              floor.y = y * 24;
              floor.x = x * 24;
              floor.scale.setTo(1.5, 1.5);
              break;
            case 2:
              // Wall
              let wall = game.add.sprite(24, 24, "walls");
              wall.frame = getWallTile(levelGen.world, x, y);
              wall.y = y * 24;
              wall.x = x * 24;
              wall.scale.setTo(1.5, 1.5);
              break;
            case 3:
              // Door
              break;
            case 4:
              // Entrance?
              break;
            case 5:
              // Exit?
              break;
            default:
              break;
          }
        });
      })
    };
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
      7,
      1,
      1,
      1,
      0 + rowOffset, // 4
      2 + rowOffset * 2,
      0 + rowOffset * 2,
      4 + rowOffset * 2,
      0 + rowOffset * 1, // 8
      2,
      0,
      4,
      0 + rowOffset * 1, // 12
      5 + rowOffset * 1,
      3 + rowOffset * 1,
      4 + rowOffset * 1
    ];

    return wallMap[marchingTile] + rowOffset * 3;
  }

  function render() {
    graphics.clear();
    graphics.beginFill(0xff0000, 1);
    graphics.drawCircle(goal.position.x, goal.position.y, 64);
  }

  var players = [];
  var globals = {
    itemSize: 15
  };
  Misc.applyUrlSettings(globals);

  var pickRandomPosition = function() {
    return {
      x: 30 + Misc.randInt(game.width - 60),
      y: 30 + Misc.randInt(game.height - 60)
    };
  };

  var Goal = function() {
    this.pickGoal();
    this.radiusesSquared = globals.itemSize * 2 * globals.itemSize;
  };

  Goal.prototype.pickGoal = function() {
    this.position = pickRandomPosition();
  };

  Goal.prototype.hit = function(otherPosition) {
    var dx = otherPosition.x - this.position.x;
    var dy = otherPosition.y - this.position.y;
    return dx * dx + dy * dy < this.radiusesSquared;
  };

  var Player = function(netPlayer, name) {
    this.netPlayer = netPlayer;
    this.name = name;
    this.position = pickRandomPosition();
    this.color = 0x00ff00;

    netPlayer.addEventListener(
      "disconnect",
      Player.prototype.disconnect.bind(this)
    );
    netPlayer.addEventListener("move", Player.prototype.movePlayer.bind(this));
    netPlayer.addEventListener("color", Player.prototype.setColor.bind(this));

    this.playerNameManager = new PlayerNameManager(netPlayer);
    this.playerNameManager.on(
      "setName",
      Player.prototype.handleNameMsg.bind(this)
    );

    this.sprite = game.add.sprite(24, 24, "players");
    this.sprite.frame = 0;
    this.sprite.scale.setTo(1.5, 1.5);
  };

  // The player disconnected.
  Player.prototype.disconnect = function() {
    for (var ii = 0; ii < players.length; ++ii) {
      var player = players[ii];
      if (player === this) {
        players.splice(ii, 1);
        return;
      }
    }
  };

  Player.prototype.movePlayer = function(cmd) {
    this.position.x = Math.floor(cmd.x * game.width);
    this.position.y = Math.floor(cmd.y * game.height);

    this.sprite.x = this.position.x;
    this.sprite.y = this.position.y;

    if (goal.hit(this.position)) {
      // This will generate a 'scored' event on the client (player's smartphone)
      // that corresponds to this player.
      this.netPlayer.sendCmd("scored", {
        points: 5 + Misc.randInt(6) // 5 to 10 points
      });
      goal.pickGoal();
    }
  };

  Player.prototype.handleNameMsg = function(name) {
    this.name = name;
  };

  Player.prototype.setColor = function(cmd) {
    this.color = cmd.color;
  };

  var server = new GameServer();
  GameSupport.init(server, globals);

  var goal = new Goal();

  // A new player has arrived.
  server.addEventListener("playerconnect", function(netPlayer, name) {
    players.push(new Player(netPlayer, name));
  });

  /*var render = function() {
    Misc.resize(canvas);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    players.forEach(function(player) {
      drawItem(player.position, player.color);
    });
    drawItem(goal.position, globals.frameCount & 4 ? 'red' : 'pink');
  };*/
});
