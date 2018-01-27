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
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
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

// Start the main app logic.
requirejs(
  [
    "../node_modules/happyfuntimes/dist/hft",
    "../node_modules/hft-sample-ui/dist/sample-ui",
    "../node_modules/hft-game-utils/dist/game-utils",
    "../node_modules/lodash/lodash.min.js",
    "../node_modules/nipplejs/dist/nipplejs.js"
  ],
  function(hft, sampleUI, gameUtils, _, nipplejs) {
    var GameClient = hft.GameClient;
    var CommonUI = sampleUI.commonUI;
    var Input = sampleUI.input;
    var Misc = sampleUI.misc;
    var MobileHacks = sampleUI.mobileHacks;
    var Touch = sampleUI.touch;

    const joystickOptions = {
      multitouch: true,
      maxNumberOfNipples: 2,
      mode: "dynamic",
      zone: document.getElementById("inputarea"),
      threshold: 0.3
    };

    let joystickManager = nipplejs.create(joystickOptions);

    var globals = {
      debug: false
    };
    Misc.applyUrlSettings(globals);
    MobileHacks.fixHeightHack();

    var score = 0;
    var statusElem = document.getElementById("gamestatus");
    var inputElem = document.getElementById("inputarea");
    var colorElem = document.getElementById("display");
    var client = new GameClient();

    CommonUI.setupStandardControllerUI(client, globals);
    CommonUI.askForNameOnce(); // ask for the user's name if not set
    CommonUI.showMenu(true); // shows the gear menu

    var randInt = function(range) {
      return Math.floor(Math.random() * range);
    };

    joystickManager
      .on("end", (evt, data) => {
        client.sendCmd("move", {
          x: 0,
          y: 0
        });
      })
      .on("move direction", (evt, data) => {
        if (data.position.x < window.innerWidth / 2) {
          // left thumbstick
          let movementPacket = {
            x: 0,
            y: 0
          };

          if (data.direction) {
            movementPacket = {
              x: Math.cos(data.angle.radian),
              y: -Math.sin(data.angle.radian),

              lookDir: data.direction.angle
            };
          }

          client.sendCmd("move", movementPacket);
        } else {
          // right thumbstick
          if (data.direction) {
            client.sendCmd("fire", {
              direction: data.direction.angle
            });
          }
        }
      });

    // Sends a move command to the game.
    //
    // This will generate a 'move' event in the corresponding
    // NetPlayer object in the game.
    var sendMoveCmd = function(position, target) {
      client.sendCmd("move", {
        x: position.x / target.clientWidth,
        y: position.y / target.clientHeight
      });
    };

    // Pick a random color
    var color =
      "rgb(" + randInt(256) + "," + randInt(256) + "," + randInt(256) + ")";
    // Send the color to the game.
    //
    // This will generate a 'color' event in the corresponding
    // NetPlayer object in the game.
    client.sendCmd("color", {
      color: color
    });
    colorElem.style.backgroundColor = color;

    // Update our score when the game tells us.
    client.addEventListener("scored", function(cmd) {
      score += cmd.points;
      statusElem.innerHTML = "You scored: " + cmd.points + " total: " + score;
    });
  }
);

function convertDirection(angle) {}
