'use strict';
var cp = require('child_process');
var sq = require('shell-quote');

var MECAB_LIB_PATH =
    process.env.MECAB_LIB_PATH ?
    process.env.MECAB_LIB_PATH :
    __dirname + '/mecab';

var buildCommand = function (text) {
    return 'LD_LIBRARY_PATH=' + MECAB_LIB_PATH + ' ' +
        sq.quote(['echo', text]) + ' | ' + MECAB_LIB_PATH + '/bin/mecab';
};

var execMecab = function (text, callback) {
    cp.exec(buildCommand(text), function(err, result) {
        if (err) { return callback(err); }
        callback(err, result);
    });    
};

var parseFunctions = {
    'pos': function (result, elems) {
        result.push([elems[0]].concat(elems[1].split(',')[0]));
        return result;
    },
    'orgform': function (result, elems) {
      //console.log(elems);
      let word = elems[0];
      let tag = elems[1].split(',')[0];
      switch(tag.charAt(0)) {
        case 'J': //조사
        case 'E': //어미
        case 'X': //접두사, 접미사
        case 'S': //symbol
          if (tag === 'SL') { break; } // allow foreign lang
          //console.log('remove:', word, tag);
          return result; //형식 형태소 무시

        case 'V': //동사만 원형으로
          if (tag[1] === 'X') { //보조용언(VX)도 무시.
            return result;
          }
          let orgForm = elems[1].split(',')[7];
          if (orgForm !== '*') {
            word = orgForm.split(/\//)[0]; 
          }
          word += '다';
          break;
      }
      result.push([word].concat(tag));
      return result;
    },
    'morphs': function (result, elems) {
        result.push(elems[0]);
        return result;
    },

    'nouns': function (result, elems) {
        var tag = elems[1].split(',')[0];
        
        if (tag === 'NNG' || tag === 'NNP') {
            result.push(elems[0]);
        }

        return result;
    }
};

var parse = function (text, method, callback) {
    execMecab(text, function (err, result) {
        if (err) { return callback(err); }

        result = result.split('\n').reduce(function(parsed, line) {
            var elems = line.split('\t');

            if (elems.length > 1) {
                return parseFunctions[method](parsed, elems);
            } else {
                return parsed;
            }
        }, []);

        callback(err, result);
    });
};

var pos = function (text, callback) {
    parse(text, 'pos', callback);
};

var orgform = function (text, callback) {
    parse(text, 'orgform', callback);
};

var morphs = function (text, callback) {
    parse(text, 'morphs', callback);
};

var nouns = function (text, callback) {
    parse(text, 'nouns', callback);
};

module.exports = {
    pos: pos,
    orgform: orgform,
    morphs: morphs,
    nouns: nouns
};
