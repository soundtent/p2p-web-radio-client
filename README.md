Start locally:
python3 -m http.server
then visit http://localhost:8000/

Bugs:
- Sometimes clients don't receive the initial peers socket message for some reason
- On safari, the audio meter doesn't display when playing an audio file as output
- Sometimes the connection fails when devices are not on the same network, and a page reload fixes this
