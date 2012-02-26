import os

def root_dir(*args): 
    # Taken from somewhere on the web where it was called `here`
    return os.path.join(os.path.abspath(os.path.dirname(__file__)), *args)

