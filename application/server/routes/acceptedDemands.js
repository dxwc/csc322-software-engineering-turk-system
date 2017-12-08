let User = require('../models/user.js');
let Demand = require('../models/demand.js');
let Rating = require('../models/rating.js');

const demand = (app, isLoggedIn, checkUserAccess) => {

  const renderManageDemands = (req, res) => {
    res.render('manageAcceptedDemands.ejs', {
      user: req.user // get the user out of session and pass to template
    });
  };

  const getUserAcceptedDemands = (req, res) => {
    Demand
      .find({ 'clientID': req.params.id, $or : [{'demandStatus' : 'bidAccepted'}, {'demandStatus' : 'submitted'}]  })
      .exec(function(err, demands) {
        if (err) {
          throw err;
        } else if (demands) {
          console.log(demands);
          //demands.demandStatus = 'submitted';
          res.json(demands);
        } else {
          res.send('No demands found');
        }
      });
  };

  // allow client to post a demand
  const postRating = (req, res) => {
    Demand
      .findOne({ '_id': req.body.systemId })
      .exec(function(err, data) {
        if (err) { throw err; }
        // grab params sent over with post request
        const ratingValue = req.body.rating;
        const fromUserId = req.user.id;
        
        let newRating = new Rating();
        newRating.fromUserId = fromUserId;
        newRating.rating = ratingValue;
        newRating.postId = req.body.systemId;
        if (ratingValue < 3) {
          newRating.ratingText = req.body.ratingText;
        }
        // Get all the bids from the demand
        // If any of the demand has the isAccepted get that
        // get array of all bids for current demand
        let currentBids = data.bids;
        // check if the new bid is accepted
        console.log(currentBids);
        for (var bid of currentBids) {
          if (bid.bidStatus === 'accepted') {
            // once accepted bid is found
            console.log(bid.bidStatus);
            newRating.toUserId = bid.userId;
            break;
          } 
        }
        
        newRating.save(function(err) {
          if (err) { throw err; }
          Rating
          .find({ 'toUserId' : req.user._id })
          .exec(function(err, allRatingsForUser) {
            if(err) { throw err; }
            //Loop through all the rating and get the sum and avg
            if (allRatingsForUser.length >= 5) {
              let sum = 0;
              allRatingsForUser.forEach((ratingObj, i) => {
                sum += ratingObj.rating;
              });
              let avgRating = sum/allRatingsForUser.length;
              User
                .findOne({ '_id' : req.user._id})
                .exec(function(err2, setUserStatus) {
                  setUserStatus.local.avgRating == avgRating;
                  setUserStatus.save(function(err) {
                        if (err) { throw err; }
                  });
                })   
            }
          });
        });
    });
  }

  app.post('/send-rate', isLoggedIn, checkUserAccess, postRating);
  app.get('/manage-accepted-demands', isLoggedIn, checkUserAccess, renderManageDemands);
  app.get('/api/acceptedDemands/:id', isLoggedIn, getUserAcceptedDemands);

  return app;
}

module.exports = demand