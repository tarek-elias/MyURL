const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');
const monk = require('monk');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { nanoid } = require('nanoid');
const cors = require('cors');
require('dotenv').config();
const db = monk(process.env.MONGO_URI);
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });
var app = express();
app.enable('trust proxy');
app.use(cors());
app.use(helmet());
app.use(morgan('tiny'));
app.use(express.json());


app.get('/:id', async (req, res, next) => {
  const { id: slug } = req.params;
  try {
    const url = await urls.findOne({ slug });
    if (url) {
      return res.json(url.url)
    }
    return res.sendStatus(404)  
  } catch (error) {
    return res.status(404).json(error.message)
  }
});

const schema = yup.object().shape({
  slug: yup.string().trim().matches(/^[\w\-]+$/i),
  url: yup.string().trim().url().required(),
});

app.post('/url',slowDown({
  windowMs: 15*60*1000,
  delayAfter: 100,
  delayMs: 500
}), async (req, res, next) => {
  let { slug, url } = req.body;
  try {
    await schema.validate({
      slug,
      url,
    });
    if (url.includes('cdg.sh')) {
      throw new Error('Stop it. 🛑');
    }
    if (!slug) {
      slug = nanoid(5);
    } else {
      const existing = await urls.findOne({ slug });
      if (existing) {
        throw new Error('Slug in use. 🍔');
      }
    }
    slug = slug.toLowerCase();
    const newUrl = {
      url,
      slug,
    };
    const created = await urls.insert(newUrl);
    console.log('created done!', created)
    res.json(created);
  } catch (error) {
    console.log(error)
    next(error);
  }
});

app.post('/his', (req, res)=>{

  const items = [
    { id: 1, name: "Apples",  price: "$2" },
    { id: 2, name: "Peaches", price: "$5" } 
  ];

  console.log(items)
  res.status(200).json('hello from server')
})


app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack,
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});