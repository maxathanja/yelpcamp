/* eslint-disable no-lonely-if */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const Campground = require('../models/campground');
const Comment = require('../models/comment');

const router = express.Router();

// middlewares
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
  }
};

const checkCampgroundOwnership = (req, res, next) => {
  if (req.isAuthenticated()) {
    Campground.findById(req.params.id, (err, foundCampground) => {
      if (err) {
        res.redirect('back');
      } else {
        // does user own the campground?
        if (foundCampground.author.id.equals(req.user._id)) {
          next();
        } else {
          res.redirect('back');
        }
      }
    });
  } else {
    res.redirect('back');
  }
};

// INDEX - Campgrounds
router.get('/', (req, res) => {
  // Get all campgrounds from DB
  Campground.find({}, (err, allCampgrounds) => {
    return err
      ? console.log(err)
      : res.render('campgrounds/index', { campgrounds: allCampgrounds });
  });
});

// CREATE - add new campground to DB
router.post('/', isLoggedIn, (req, res) => {
  const { name } = req.body;
  const { image } = req.body;
  const { description } = req.body;
  const author = {
    id: req.user._id,
    username: req.user.username,
  };
  const newCampground = { name, image, description, author };
  // Create a new campground and save to DB
  Campground.create(newCampground, (err /* , newlyCreated */) => {
    return err ? console.log(err) : res.redirect('/campgrounds');
  });
});

// NEW - show form to create new campground
router.get('/new', isLoggedIn, (req, res) => {
  res.render('campgrounds/new');
});

// SHOW - shows more info about one campground
router.get('/:id', (req, res) => {
  // find the campground with the provided ID
  Campground.findById(req.params.id)
    .populate('comments')
    .exec((err, foundCampground) => {
      return err
        ? console.log(err)
        : res.render('campgrounds/show', { campground: foundCampground });
    });
});

// EDIT Campground Route
router.get('/:id/edit', checkCampgroundOwnership, (req, res) => {
  Campground.findById(req.params.id, (err, foundCampground) => {
    return err
      ? res.redirect('back')
      : res.render('campgrounds/edit', { campground: foundCampground });
  });
});

// UPDATE Campground Route
router.put('/:id', checkCampgroundOwnership, (req, res) => {
  const { id } = req.params;
  const { campground } = req.body;
  // find and update the correct campground
  Campground.findByIdAndUpdate(id, campground, (err, updatedCampground) => {
    return err
      ? res.redirect('/campgrounds')
      : // redirect to show page
        res.redirect(`/campgrounds/${updatedCampground.id}`);
  });
});

// * Delete campground and its comments:
// ? https://www.udemy.com/the-web-developer-bootcamp/learn/v4/questions/6168552
// ? https://www.youtube.com/watch?v=5iz69Wq_77k

// DESTROY Campground (with its comments) Route
router.delete('/:id', checkCampgroundOwnership, (req, res) => {
  Campground.findById(req.params.id, (err, campground) => {
    // * to use code below, first uncomment pre-hook in campground model
    // return err ? next(err) : (campground.remove(), res.redirect('/campgrounds'));
    // * to use code above, first comment the code below
    Comment.deleteMany(
      {
        _id: {
          $in: campground.comments,
        },
      },
      err => {
        return err ? console.log(err) : (campground.remove(), res.redirect('/campgrounds'));
      }
    );
  });
});

module.exports = router;
