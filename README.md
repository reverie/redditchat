# Installation #
 1. fork and clone
 2. `cd server`
 3. `ssh-keygen -f id_rsa`
 4. Copy the public key to your clipboard. (On OS X: `cat id_rsa.pub | pbcopy`.)
 5. Open the GitHub admin page for the project. Go to Deploy Deys > Add another deploy key. Paste the key in.
 6. Fix the settings at the top of `fabfile.py`, including the domain, sever username, and GitHub path.
 7. fix the `SECRET_KEY` value to `redditchat/settings.py`
 8. Start an Ubuntu 11.10 server. Make sure your domain and all subdomains are resolving correctly to point to your server.
 9. From your local checkout, make sure you have Fabric and jinja2 installed. (`pip install Fabric jinja2`)
 10. `fab stage_dev bootstrap_everything`

That's it, your server should now be running the site.

