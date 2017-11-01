/*
 Licensed to the StackStorm, Inc ('StackStorm') under one or more
 contributor license agreements.  See the NOTICE file distributed with
 this work for additional information regarding copyright ownership.
 The ASF licenses this file to You under the Apache License, Version 2.0
 (the "License"); you may not use this file except in compliance with
 the License.  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/*jshint quotmark:false*/
/*global describe, it*/
"use strict";

var chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  messages = require('../lib/messages.js'),
  utils = require('../lib/utils.js');


describe('buildMessages', function() {
  it('should return message in array', function() {
    var result = messages.buildMessages({
      attachments: [
        {
          fields: [
            {
              value: "sneeches with stars on their bellies!"
            }
          ]
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(1);
    expect(result).to.deep.equal([{
      attachments: [
        {
          fields: [
            {
              value: "sneeches with stars on their bellies!"
            }
          ]
        }
      ]
    }]);
  });

  it('should only send attachments once when it breaks up long text', function () {
    var result = messages.buildMessages({
      text: ''+(new Array(200).join("Horton hears a Who  "))+'',
      attachments: [
        {
          text: "Horton hatches an egg"
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(2);
    expect(result).to.deep.equal([
      {
        text: ''+(new Array(199).join("Horton hears a Who  "))+'Horton hears a'
      },
      {
        text: " Who  ",
        attachments: [
          {
            text: "Horton hatches an egg"
          }
        ]
      }
    ]);
  });

  it('should only send message text once when it breaks up attachment text', function () {
    var result = messages.buildMessages({
      text: ''+(new Array(200).join("Horton hears a Who  "))+'',
      attachments: [
        {
          text: ''+(new Array(3*172).join("Horton hatches an egg  "))+''
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(4);
    expect(result).to.deep.equal([
      {
        text: ''+(new Array(199).join("Horton hears a Who  "))+'Horton hears a'
      }, {
        text: " Who  ",
        attachments: [
          {
            text: ''+(new Array(172).join("Horton hatches an egg  "))+"Horton hatches an egg "
          }
        ]
      }, {
        attachments: [
          {
            text: ' '+(new Array(172).join("Horton hatches an egg  "))+"Horton hatches an egg"
          }
        ]
      }, {
        attachments: [
          {
            text: '  '+(new Array(172).join("Horton hatches an egg  "))+''
          }
        ]
      }
    ]);
  });

  it('should send attachments individually', function() {
    var result = messages.buildMessages({
      attachments: [
        {
          fields: [
            {
              value: '0'+(new Array(3900).join('1'))+'2'
            }
          ]
        }, {
          fields: [
            {
              value: '0'+(new Array(3900).join('3'))+'2'
            }
          ]
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(2);
    expect(result).to.deep.equal([
      {
        attachments: [
          {
            fields: [
              {
                value: '0'+(new Array(3900).join('1'))+'2'
              }
            ]
          }
        ]
      }, {
        attachments: [
          {
            fields: [
              {
                value: '0'+(new Array(3900).join('3'))+'2'
              }
            ]
          }
        ]
      }
    ]);
  });
});


describe('buildMessagesChunkedText', function() {
  it('should return message in array', function() {
    var result = messages.buildMessages({
      text: "sneeches with no stars on their bellies!",
      attachments: [
        {
          text: "The Cat in the Hat never came back",
          fields: [
            {
              value: '0'+(new Array(3900).join('1'))+'2'
            }
          ]
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(2);
    expect(result).to.deep.equal([{
      attachments: [
        {
          text: "The Cat in the Hat never came back"
        }
      ],
      text: "sneeches with no stars on their bellies!"
    }, {
      attachments: [
        {
          fields: [
            {
              value: '0'+(new Array(3900).join('1'))+'2'
            }
          ]
        }
      ]
    }]);
  });
});


describe('buildMessagesWithSingleAttachment', function() {
    it('should readably break up attachment text', function () {
    // This test is brittle, and depends on the exact values of all of the
    // message to send, as well as utils.SLACK_MAX_MESSAGE_SIZE.
    var result = messages.buildMessages({
      icon_emoji: ":drseuss:",
      username: "mgoose",
      color: "458967",
      attachments: [
        {
          // Make this different than the text
          fallback: 'Mother Goose and Dr. Seuss go together like a hoose with a moose',
          pretext: '@chanel',  // Deliberately misspelled
          author_name: 'Theodor Seuss Geisel',
          author_link: "https://en.wikipedia.org/wiki/Dr._Seuss",
          author_icon: "drseuss",
          title: "Nursery Rhymes",
          title_link: "https://en.wikipedia.org/wiki/Mother_Goose",
          image_url: "https://en.wikipedia.org/wiki/Dr._Seuss#/media/File:Ted_Geisel_NYWTS_2_crop.jpg",
          thumb_url: "https://en.wikipedia.org/wiki/Dr._Seuss#/media/File:Dr_Seuss_signature.svg",
          text: ''+(new Array(120).join('Dr. Seuss and Mother Goose go together like a moose in a hoose.  '))+'',
          fields: [
            {
              name: "Summary",
              value: "Word to your moms, I came to drop bombes, I got more rhymes than your book's got psalms",
              short: false
            }
          ],
          footer: "Regards, The Cat in the Hat",
          footer_icon: "catinthehat",
          ts: 1234567890
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(3);
    expect(result).to.deep.equal([
      {
        icon_emoji: ":drseuss:",
        username: "mgoose",
        color: "458967",
        attachments: [
          {
            // Make this different than the text
            fallback: 'Mother Goose and Dr. Seuss go together like a hoose with a moose',
            pretext: '@chanel',  // Deliberately misspelled
            author_name: 'Theodor Seuss Geisel',
            author_link: "https://en.wikipedia.org/wiki/Dr._Seuss",
            author_icon: "drseuss",
            title: "Nursery Rhymes",
            title_link: "https://en.wikipedia.org/wiki/Mother_Goose",
            image_url: "https://en.wikipedia.org/wiki/Dr._Seuss#/media/File:Ted_Geisel_NYWTS_2_crop.jpg",
            thumb_url: "https://en.wikipedia.org/wiki/Dr._Seuss#/media/File:Dr_Seuss_signature.svg",
            text: ''+(new Array(50).join('Dr. Seuss and Mother Goose go together like a moose in a hoose.  '))+'Dr. Seuss and Moth'
          }
        ]
      }, {
        icon_emoji: ":drseuss:",
        username: "mgoose",
        color: "458967",
        attachments: [
          {
            text: (
              "er Goose go together like a moose in a hoose.  "+
              (new Array(49).join('Dr. Seuss and Mother Goose go together like a moose in a hoose.  '))+
              "Dr. Seuss and Mother Goose go togeth"
            )
          }
        ]
      }, {
        icon_emoji: ":drseuss:",
        username: "mgoose",
        color: "458967",
        attachments: [
          {
            text: (
              "er like a moose in a hoose.  "+
              (new Array(21).join('Dr. Seuss and Mother Goose go together like a moose in a hoose.  '))
            ),
            fields: [
              {
                name: "Summary",
                value: "Word to your moms, I came to drop bombes, I got more rhymes than your book's got psalms",
                short: false
              }
            ],
            footer: "Regards, The Cat in the Hat",
            footer_icon: "catinthehat",
            ts: 1234567890
          }
        ]
      }
    ]);
  });
});


describe('buildMessagesWithChunkedAttachmentText', function() {
  it('should send fields individually', function() {
    var result = messages.buildMessages({
      attachments: [
        {
          text: "And that is a story I think no one can beat\nAnd to think that I saw it on Mulberry Street.",
          fields: [
            {
              value: '0'+(new Array(utils.SLACK_MAX_MESSAGE_SIZE-80).join('3'))+'2'
            }, {
              value: '0'+(new Array(utils.SLACK_MAX_MESSAGE_SIZE-80).join('5'))+'2'
            }
          ]
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(3);
    expect(result).to.deep.equal([
    {
      attachments: [
        {
          text: "And that is a story I think no one can beat\nAnd to think that I saw it on Mulberry Street."
        }
      ]
    }, {
      attachments: [
        {
          fields: [
            {
              value: '0'+(new Array(utils.SLACK_MAX_MESSAGE_SIZE-80).join('3'))+'2'
            }
          ]
        }
      ]
    }, {
      attachments: [
        {
          fields: [
            {
              value: '0'+(new Array(utils.SLACK_MAX_MESSAGE_SIZE-80).join('5'))+'2'
            }
          ]
        }
      ]
    }
    ]);
  });
});


describe('buildMessagesWithSingleFieldInAttachment', function () {
  it('should chunk up field value', function () {
    var result = messages.buildMessages({
      attachments: [
        {
          text: "And that is a story I think no one can beat\nAnd to think that I saw it on Mulberry Street.",
          fields: [
            {
              value: '0'+(new Array(2*utils.SLACK_MAX_MESSAGE_SIZE-200).join('3'))+'2'
            }
          ]
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(3);
    expect(result).to.deep.equal([
    {
      attachments: [
        {
          text: "And that is a story I think no one can beat\nAnd to think that I saw it on Mulberry Street."
        }
      ]
    }, {
      attachments: [
        {
          fields: [
            {
              value: '0'+(new Array(utils.SLACK_MAX_MESSAGE_SIZE-43).join('3'))
            }
          ]
        }
      ]
    }, {
      attachments: [
        {
          fields: [
            {
              value: (new Array(utils.SLACK_MAX_MESSAGE_SIZE-156).join('3'))+'2'
            }
          ]
        }
      ]
    }
    ]);
  });
});


describe('buildMessagesWithChunkedFieldValue', function() {
  it('should return message in array', function() {
    var result = messages.buildMessages({
      icon_emoji: ":drseuss:",
      username: "Dr. Seuss",
      attachments: [
        {
          text: "And that is a story I think no one can beat\nAnd to think that I saw it on Mulberry Street.",
          fields: [
            {
              name: '0'+(new Array(2*utils.SLACK_MAX_MESSAGE_SIZE-200).join('3'))+'2',
              value: "The 500 Hats of Bartholomew Cubbins"
            }
          ]
        }
      ]
    });

    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.lengthOf(2);
    expect(result).to.deep.equal([
      {
        icon_emoji: ":drseuss:",
        username: "Dr. Seuss",
        attachments: [
          {
            text: "And that is a story I think no one can beat\nAnd to think that I saw it on Mulberry Street."
          }
        ]
      }, {
        icon_emoji: ":drseuss:",
        username: "Dr. Seuss",
        text: "ERROR: Could not complete request because there was too much data to send"
      }
    ]);
  });
});
