const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { ApiResponse } = require('./utils/apiResponse');
const { AppError } = require('./utils/apiError');
const errorHandler = require('./middleware/errorHandler');
require('./config/passport')(passport);

const app = express();

app.use(helmet());

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

if (config.env === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(passport.initialize());

const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: ApiResponse.error('Too many requests, please try again later.', 429)
});

app.use(generalLimiter);

app.use('/api', routes);

app.use((req, res, next) => {
  next(new AppError(`Not found - ${req.originalUrl}`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;

