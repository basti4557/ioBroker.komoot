![Logo](admin/komoot.png)

# KOMOOT Adapter

## Receive Komoot Tours and Informations

Receive Komoot Updates like tours and other specific data.
 

## Changelog

### 0.3.7 (2022-07-30)
* (basti4557) In tours the distance, speed and duration are now handled as floats (not integer).

### 0.3.6 (2022-07-25)
* (basti4557) UserId is again stored after first fetch (has been commentet out in 0.3.5)

### 0.3.5 (2022-07-24)
* (basti4557) Fixed that no user id could be fetched.
* (basti4557) Moving time and total distance now finally works again :)

### 0.3.4 (2022-07-16)
* (basti4557) Fixed crash because of change on there website.

### 0.3.3 (2022-03-06)
* (basti4557) Fixed crash because of general infos. (Dont work atm but at least now dont crashes anymore)

### 0.3.2 (2022-03-06)
* (basti4557) Fixed datatype of info.followers and info.following

### 0.3.1 (2021-12-21)
* (basti4557) Saving states with ack true
* (basti4557) Followers, Following, Tours got a JSON output

### 0.3.0 (2021-12-20)
* (basti4557) Added tour map picture to the tour entity
* (basti4557) Get followers
* (basti4557) Get Following
* (basti4557) Added general info about how many followers / following you have

### 0.2.0 (2021-12-20)
* (basti4557) Fetch your recorded tours
* (basti4557) Fetch your overall distance and duration
* (basti4557) Added error handling when komoot is not available
* (basti4557) Default syncronisation time is moved from 1 min to 5 min

### 0.1.0 (2021-12-18)
* (basti4557) Authorize with email and password
* (basti4557) Get your userId and lastTourId


## License

The MIT License (MIT)

Copyright (c) 2021, basti4557 <sebastian@vindicators.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.