var request = require('supertest')
  , mocha = require('mocha')
  , should = require('should')
  , app = require('../app.js')
  , request = request(app)
  , crypto = require('crypto')
  , fs = require('fs')
  , async = require('async')
  , _ = require('underscore')
  , user = require('../lib/users.js')
  , PackageModel = require('../models/package.js').PackageModel
  , UserModel = require('../models/user.js').UserModel;


var reptiles = ["Alligator", "Snapping turtle","Box turtle","Eastern box turtle","Aquatic box turtle",
              "Black-nobbed map turtle","Common slider","Chinese three-striped box turtle","Japanese pond turtle",
              "Common musk turtle","Aldabra tortoise","Radiated tortoise","Yellow-footed tortoise","Star tortoise",
              "Desert tortoise","Gopher tortoise","Home’s hingback tortoise","African pancake tortoise",
              "Hermann’s tortoise","Egyptian tortoise","Mountain horn-headed lizard","Philippine sail-finned lizard",
              "Inland bearded dragon","Mali spiny-tailed lizard","Green crested basilisk","Green iguana",
              "San Esteban Island chuckwalla","Leopard gecko","Ocellated lacerta","Prehensile-tailed skink",
              "Blue-tongued skink","Scheltopusik/glass lizard","Mexican beaded lizard","Komodo dragon/Ora",
              "Boa constrictor","Pacific boa","Emerald tree boa","Garden tree boa","Island boa","Green anaconda",
              "Rough-scaled sand boa","Children’s python","Carpet/diamond python","Asian rock python",
              "Royal/ball python","Gopher/pine snake","Rhinoceros snake","Baja ratsnake","Indigo snake",
              "Cornsnake/red ratsnake","Ratsnake","Red mountain racer","Taiwan beauty snake","Eastern hognose snake",
              "Grey-banded kingsnake","Common kingsnake"];

var birds = ["Black-necked swan","Mute swan","Cinnamon teal","Pintail","Chiloe wigeon","Gadwall","Marbled teal","Rosybill",
            "African pygmy goose","Ruddy duck","Chilean flamingo","American flamingo","Wood stork","White stork",
            "Saddle-billed stork","Roseate spoonbill","American white pelican","Black vulture","Cinereous vulture",
            "Golden eagle","Red-tailed hawk","Red-shouldered hawk","Bald eagle","Mississippi kite","Secretary bird",
            "Kori bustard","Red-crested bustard","Sunbittern","Buff-banded rail","Black-crowned crane","White-naped crane",
            "Sandhill crane","Manchurian crane"];

var keywords = ["adorable","beautiful","clean","drab","elegant","fancy","glamorous","handsome","long","magnificent",
              "old-fashioned","plain","quaint","sparkling","ugliest","unsightly","wide-eyed","broad","chubby","crooked",
              "curved","deep","flat","high","hollow","low","narrow","round","shallow","skinny","square","steep","straight",
              "wide","boiling","breeze","broken","bumpy","chilly","cold","cool","creepy","crooked","cuddly","curly","damaged",
              "damp","dirty","dry","dusty","filthy","flaky","fluffy","freezing","hot","warm","wet"];

var groups = ['global', 'the cool group', 'cool kidz', 'adsk'];
var pkg_datas = [];
var ds_pkg_datas = [];

describe('Package route tests.', function(){
    
    before(function(done){
        user.initDebugUser();
        done();
    })
    
    after(function(done){
        done();
    })
    
    // This code attempts to insert a large number of elements into the package manager database.
    // It has the side effect of actually populating the database with these elements, so be wary of
    // when and how you use it.
    describe('/pkg', function(){

        this.timeout(80000);

        var j = 0;

        var series_funcs = [];

        for (var i = 0; i < 5; i++) {

            var pkg_keywords = [];
            var num_keywords = Math.floor( Math.random() * 6 );

            for (j = 0; j < num_keywords; j++) {
            pkg_keywords.push( keywords[ Math.floor( Math.random() * keywords.length )] );
            }

            var pkg_data = {
                name: birds[i]
                , description: pkg_keywords.join(' ') + ' ' + 'package'
                , keywords: pkg_keywords
                , version: '0.0.1'
                , group: groups[Math.floor(Math.random() * 4)]
                , engine: 'dynamo'
                , engine_version: '0.3.1'
                , license: 'MIT'
                , contents: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod'
            };

            ds_pkg_datas.push(pkg_data);

            // add some dependencies
            var num_deps = 2;

            if ( i >= num_deps ) {

                var deps = [];
                var deps_map = {};
                var name = "";
                
                // search for few dependencies, making sure there are no dups
                while( deps.length < num_deps ) {
                    name = ds_pkg_datas[ Math.floor( Math.random() * i ) ].name;

                    if ( deps_map[name] === undefined ){
                    deps.push(name);
                    deps_map[name] = 1;
                    }
                }
                
                // define the dependencies array
                ds_pkg_datas[i].dependencies = [];

                for (var k = 0; k < num_deps; k++) {
                    ds_pkg_datas[i].dependencies.push( { name: deps[k], version: "0.0.1", engine: "dynamo" } )
                }
            }
        }

        it('POST should respond with success json', function(done) {

            for (var i = 0; i < 5; i++){
                if ( i != 4){
                    setTimeout( ( function(pkg_data) {
                    return function() {
                        add_pkg( pkg_data, function() {} );
                    }
                    })(ds_pkg_datas[i]), 4000 * i );
                } else {
                    setTimeout( ( function(pkg_data) {
                    return function() {
                        add_pkg( pkg_data, done );
                    }
                    })(ds_pkg_datas[i]), 4000 * i );  
                }
            }
        });
        
    });
    
    describe('/whitelist', function(){
    
        var pkg_id;
        
        before(function(done){
            
            remove_all_from_white_list(function(err){
                if(err){
                    done(err);
                }
         
                PackageModel.find({}, function(err,pkgs){
                    if(err || !pkgs) return done(err);
                    pkg_id = pkgs[0].id;
                    done();
                });
                
            });
        });
        
        after(function(done){
            remove_all_from_white_list(function(err){
                if(err){
                    done(err);
                }
                done();
            });

        });
        
        it('PUT should not white list a package if the request is not from a super user.', function(done){
           
           // demote our test user
           UserModel.update({username:'test'},{super_user:false}, function(err, num){
               console.log(num);
               request
                .put('/whitelist/' + pkg_id)
                .auth('test','e0jlZfJfKS')
                .expect(403)
                .end(function(err,res){
                    
                    if(err) {
                        return done(err);
                    }

                    // promote our user back to his super status
                    UserModel.update({username:'test'},{super_user:true}, function(err, num){
                        if(err) done(err);
                        done();
                    });
                }); 
           });
        });
        
        it('GET should return an empty list if there are no white listed pacakges.', function(done){
            request
                .get('/whitelist/')
                .auth('test','e0jlZfJfKS')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.content.length.should.equal(0);
                    done();
                });
        })
        
        it('PUT should white list a package.', function(done){
            
            request
                .put('/whitelist/' + pkg_id)
                .auth('test','e0jlZfJfKS')
                .expect(201)
                .end(function(err,res){
                    if(err) {
                        return done(err);
                    }
                    PackageModel.findOne({_id:pkg_id}, function(err,pkg){
                        if(err || !pkg) return done(err);
                        (pkg.white_list).should.be.true;
                        done();
                    });
                });
        });
        
        it('GET should return all white listed packages.', function(done){
            
            request
                .get('/whitelist')
                .auth('test','e0jlZfJfKS')
                .expect(200)
                .end(function(err,res){
                    if(err) {
                        return done(err);
                    }
                    res.body.content.length.should.equal(1);
                    done();
                });
        });
        
        it('PUT should remove a package from the white list with.', function(done){
            
            request
                .put('/unwhitelist/' + pkg_id)
                .auth('test','e0jlZfJfKS')
                .expect(201)
                .end(function(err,res){
                    if(err) return done(err);
                    PackageModel.findOne({_id:pkg_id}, function(err,pkg){
                        if(err || !pkg) return done(err);
                        (pkg.white_list).should.be.false;
                        done();
                    });
                });
        });

        it('PUT should return 404 with bad package id.', function(done){
            
            request
                .put('/whitelist/56b5263b71a1a8687e000008') // a non-existent id
                .auth('test','e0jlZfJfKS')
                .expect(404)
                .end(function(err,res){
                    if(err) {
                        return done(err);
                    }
                    done();
                });
        });
    });
});

function remove_all_from_white_list(callback){
    PackageModel.update({white_list:true}, {white_list:false}, function(err, num){
        if(err) {
            console.log("There was an error removing packages from the white list.");
            callback(err);
        }
        callback(null, num);
    });
}

function add_pkg(pkg_data, done){

  var shasum = crypto.createHash('sha256');
  var s = fs.ReadStream( 'test/uploads/pkg_test.zip' );

  s.on('data', function(d) {
    shasum.update(d);
  });

  s.on('end', function() {

    pkg_data.file_hash = shasum.digest('base64');

    request
      .post('/package')
      .auth('test','e0jlZfJfKS')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .field('pkg_header', JSON.stringify( pkg_data ) )
      .attach('pkg', 'test/uploads/pkg_test.zip')
      .end(function(err, res){

        console.error( 'pkg_add_result', res.body);

        if (err) {
          return done(err);
        }

        should.equal(res.body.success, true);

        new_version_correct(pkg_data, function(error) { 
          new_version_fail(pkg_data, function(error){
            new_vote( res.body.content._id, 200, function(error) {
              new_vote( res.body.content._id, 403, function(error) {
                done(error);
              });
            });
          });
        });
      });
    });
}

function increment_version(version) {

  var split_version = version.split('.')
  split_version.forEach( function(e, i) {
    split_version[i] = parseInt(i);
  });
  split_version[1] = split_version[1] + 1;
  return split_version.join('.');

}

function new_version_correct(pkg_data, done) {

  pkg_data.version = increment_version( pkg_data.version );

  var shasum = crypto.createHash('sha256');
  var s = fs.ReadStream( 'test/uploads/pkg_test.zip' );

  s.on('data', function(d) {
    shasum.update(d);
  });

  s.on('end', function() {

    pkg_data.file_hash = shasum.digest('base64');

    request
      .put('/package')
      .auth('test','e0jlZfJfKS')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .field('pkg_header', JSON.stringify( pkg_data ) )
      .attach('pkg', 'test/uploads/pkg_test.zip')
      .end(function(err, res){
        if (err)  return done(err);
        should.equal(res.body.success, true);
        console.error( 'new_version_correct_result', res.body )
        done();

      });
    });

}

function new_version_fail(pkg_data, done) {

  var shasum = crypto.createHash('sha256');
  var s = fs.ReadStream( 'test/uploads/pkg_test.zip' );

  s.on('data', function(d) {
    shasum.update(d);
  });

  s.on('end', function() {

    pkg_data.file_hash = shasum.digest('base64');

    request
      .put('/package')
      .auth('test','e0jlZfJfKS')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .field('pkg_header', JSON.stringify( pkg_data ) )
      .attach('pkg', 'test/uploads/pkg_test.zip')
      .end(function(err, res){
        if (err)  return done(err);
        should.equal(res.body.success, false);
        console.error( 'new_version_fail_result', res.body )
        done();

      });
    });

}

function lookup_success( pkg_id, done) {

  request
    .get('/package/' + pkg_id )
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(200)
    .end(function(err, res){
      if (err) return done(err);
      console.error( 'lookup_result', res.body )
      should.equal(res.body.success, true);
      done(res);
    });

}

function new_vote(pkg_id, status_code_expected, done){

  request
    .put('/upvote/' + pkg_id )
    .auth('test','e0jlZfJfKS')
    .set('Accept', 'application/json')
    .expect('Content-Type', /json/)
    .expect(status_code_expected)
    .end(function(err, res){

      if (err) return done(err);
      console.error( 'new_vote_result', res.body )
      should.equal(res.body.success, (status_code_expected === 200) );

      done();

    });

}


// describe('POST /pkg_upvote/:id', function(){

//   it('should require auth', function(done){

//     request
//       .put('/pkg_upvote/1441notanid' )
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(401)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, false);
//         done(res);
//       });
//   });

// });

// describe('GET /pkg_search/:query', function(){

//   it('should respond with data as this is a valid query', function(done){
//     request
//       .get('/pkg_search/cool')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, true);
//         done();
//       });
//   });

//   it('should respond with data as this is a valid query', function(done){
//     request
//       .get('/pkg_search/')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, true);
//         done();
//       });
//   });

// });

// test user_id
// describe('GET /user/:id', function(){

  // it('should respond with user object as this id does exist', function(done){
  //   request
  //     .get('/user_id/513903692d4dc7118b000003')
  //     .set('Accept', 'application/json')
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(function(err, res){
  //       if (err) return done(err);
  //       should.equal(res.body.content.username, 'test');
  //       should.equal(res.body.success, true);
  //       done();
  //     });
  // });

//   it('should respond with error object as this id does not exist', function(done){
//     request
//       .get('/user/5137a7')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, false);
//         done();
//       });
//   });

// });

// // test user_name
// describe('GET /user_name/:name', function(){

//   it('should respond with user object as this username does exist', function(done){
//     request
//       .get('/user_name/test')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.content.username, 'test');
//         should.equal(res.body.success, true);
//         done();
//       });
//   });

//   it('should respond with error object as this name does not exist', function(done){
//     request
//       .get('/user_name/5137a7')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, false);
//         done();
//       });
//   });

// });

// describe('GET /pkg/:id', function(){

//   it('should respond with error object as this package does not exist', function(done){
//     request
//       .get('/pkg/20983')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, false);
//         done();
//       });
//   });

// });

// test pkg_engine
// describe('GET /pkg_engine/:engine', function(){

//   it('should respond with a list of packages as \'dynamo\' is a valid engine name', function(done){
//     request
//       .get('/pkg_engine/dynamo')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, true);
//         done();
//       });
//   });

//   it("should respond with error object as this engine does not exist", function(done){
//     request
//       .get('/pkg_engine/donk')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, false);
//         done();
//       });
//   });

// });

// describe('PUT /pkg', function(){

//   var pkg_data = {
//       name: "CoolPackage"+Date.now()
//     , description: "Cool description"
//     , keywords: ['cool', 'neat', 'fun']
//     , version: '0.0.1'
//     , engine: 'dynamo'
//     , engine_version: '0.3.1'
//     , license: 'MIT'
//   };

//   it('should respond with 401 as not authorized.', function(done){

//     request
//       .put('/pkg')
//       .set('Content-Type', 'application/json')
//       .send(pkg_data)
//       .expect(401, done);

//   });

//   it('should respond with 401 as not authorized.', function(done){

//     request
//       .put('/pkg')
//       .auth('dope','e0jlZfJfKS')
//       .set('Content-Type', 'application/json')
//       .send(pkg_data)
//       .expect(401, done);

//   });

//   it('should respond with failure json as package name does not exist', function(done){

//     request
//       .put('/pkg')
//       .auth('test','e0jlZfJfKS')
//       .set('Content-Type', 'application/json')
//       .send(pkg_data)
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200)
//       .end(function(err, res){
//         if (err) return done(err);
//         should.equal(res.body.success, false);
//         done();
//       });
//   });

// });

// describe('GET /pkg_download/:id', function(){

//   it('should respond with json', function(done){
//     request
//       .get('/pkg_download/20983')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200, done);
//   });

// });

// describe('DELETE /pkg/:id/:version', function(){

//   it('should respond with json', function(done){
//     request
//       .del('/pkg')
//       .auth('test','e0jlZfJfKS')
//       .set('Accept', 'application/json')
//       .expect('Content-Type', /json/)
//       .expect(200, done);
//   })

// });
