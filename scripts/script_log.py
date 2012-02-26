import logging
import os

def make_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    filename = name + '.log'
    path = os.path.join('/project/redditchat/log/', filename)
    fh = logging.FileHandler(path)
    fh.setFormatter(formatter)
    logger.addHandler(fh)
    return logger

def log(logger, level, *args):
    msg = ' '.join(unicode(a) for a in args)
    getattr(logger, level)(msg)
    



