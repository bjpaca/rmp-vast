import { FW } from '../fw/fw';
import { FWVAST } from '../fw/fw-vast';
import { PING } from '../tracking/ping';

const ICONS = {};

ICONS.destroy = function () {
  if (DEBUG) {
    FW.log('RMP-VAST: start destroying icons');
  }
  let icons = this.adContainer.getElementsByClassName('rmp-ad-container-icons');
  for (let i = 0, len = icons.length; i < len; i++) {
    this.adContainer.removeChild(icons[i]);
  }
};

var _programAlreadyPresent = function (program) {
  for (let i = 0, len = this.icons.length; i < len; i++) {
    if (this.icons[i].program === program) {
      return true;
    }
  }
  return false;
};

ICONS.parse = function (icons) {
  if (DEBUG) {
    FW.log('RMP-VAST: start parsing for icons');
  }
  let icon = icons[0].getElementsByTagName('Icon');
  for (let i = 0, len = icon.length; i < len; i++) {
    let currentIcon = icon[i];
    let program = currentIcon.getAttribute('program');
    // program is required attribute ignore the current icon if not present
    if (program === null || program === '') {
      continue;
    }
    // if program already present we ignore it
    if (_programAlreadyPresent.call(this, program)) {
      continue;
    }
    // width, height, xPosition, yPosition are all required attributes
    // if one is missing we ignore the current icon
    let width = currentIcon.getAttribute('width');
    if (width === null || width === '' || parseInt(width) < 1) {
      continue;
    }
    let height = currentIcon.getAttribute('height');
    if (height === null || height === '' || parseInt(height) < 1) {
      continue;
    }
    let xPosition = currentIcon.getAttribute('xPosition');
    if (xPosition === null || xPosition === '') {
      continue;
    }
    let yPosition = currentIcon.getAttribute('yPosition');
    if (yPosition === null || yPosition === '') {
      continue;
    }
    let staticResource = currentIcon.getElementsByTagName('StaticResource');
    // we only support StaticResource (IFrameResource HTMLResource not supported)
    if (staticResource.length !== 1) {
      continue;
    }
    // in StaticResource we only support images (application/x-javascript and application/x-shockwave-flash not supported)
    let creativeType = staticResource[0].getAttribute('creativeType');
    let imagePattern = /^image\/(gif|jpeg|jpg|png)$/i;
    if (creativeType === null || creativeType === '' || !imagePattern.test(creativeType)) {
      continue;
    }
    let staticResourceUrl = FWVAST.getNodeValue(staticResource[0], true);
    if (staticResourceUrl === null) {
      continue;
    }
    let iconData = {
      program: program,
      width: width,
      height: height,
      xPosition: xPosition,
      yPosition: yPosition,
      staticResourceUrl: staticResourceUrl
    };
    // optional IconViewTracking
    let iconViewTracking = currentIcon.getElementsByTagName('IconViewTracking');
    let iconViewTrackingUrl = FWVAST.getNodeValue(iconViewTracking[0], true);
    if (iconViewTrackingUrl !== null) {
      iconData.iconViewTrackingUrl = iconViewTrackingUrl;
    }
    //optional IconClicks
    let iconClicks = currentIcon.getElementsByTagName('IconClicks');
    if (iconClicks.length === 1) {
      let iconClickThrough = iconClicks[0].getElementsByTagName('IconClickThrough');
      let iconClickThroughUrl = FWVAST.getNodeValue(iconClickThrough[0], true);
      if (iconClickThroughUrl !== null) {
        iconData.iconClickThroughUrl = iconClickThroughUrl;
        let iconClickTracking = iconClicks[0].getElementsByTagName('IconClickTracking');
        if (iconClickTracking.length > 0) {
          iconData.iconClickTrackingUrl = [];
          for (let i = 0, len = iconClickTracking.length; i < len; i++) {
            let iconClickTrackingUrl = FWVAST.getNodeValue(iconClickTracking[i], true);
            if (iconClickTrackingUrl !== null) {
              iconData.iconClickTrackingUrl.push(iconClickTrackingUrl);
            }
          }
        }
      }
    }
    this.icons.push(iconData);
  }
  if (DEBUG) {
    FW.log('RMP-VAST: validated parsed icons follows');
    FW.log(this.icons);
  }
};

var _onIconClickThrough = function (index) {
  if (DEBUG) {
    FW.log('RMP-VAST: click on icon with index ' + index);
  }
  try {
    // open ClickThrough link for icon
    window.open(this.icons[index].iconClickThroughUrl, '_blank ');
    // send trackers if any for IconClickTracking
    if (typeof this.icons[index].iconClickTrackingUrl !== 'undefined') {
      let iconClickTrackingUrl = this.icons[index].iconClickTrackingUrl;
      if (iconClickTrackingUrl.length > 0) {
        iconClickTrackingUrl.forEach((element) => {
          PING.tracking.call(this, element, null);
        });
      }
    }
  } catch (e) {
    FW.trace(e);
  }
};

var _onIconLoadPingTracking = function (index) {
  if (DEBUG) {
    FW.log('RMP-VAST: IconViewTracking for icon at index ' + index);
  }
  PING.tracking.call(this, this.icons[index].iconViewTrackingUrl, null);
};

var _onPlayingAppendIcons = function () {
  if (DEBUG) {
    FW.log('RMP-VAST: playing states has been reached - append icons');
  }
  this.vastPlayer.removeEventListener('playing', this.onPlayingAppendIcons);
  for (let i = 0, len = this.icons.length; i < len; i++) {
    let icon = document.createElement('img');
    icon.className = 'rmp-ad-container-icons';

    icon.style.width = parseInt(this.icons[i].width) + 'px';

    icon.style.height = parseInt(this.icons[i].height) + 'px';

    let xPosition = this.icons[i].xPosition;
    if (xPosition === 'left') {
      icon.style.left = '0px';
    } else if (xPosition === 'right') {
      icon.style.right = '0px';
    } else if (parseInt(xPosition) >= 0) {
      icon.style.left = xPosition + 'px';
    } else {
      icon.style.left = '0px';
    }

    let yPosition = this.icons[i].yPosition;
    if (yPosition === 'top') {
      icon.style.top = '0px';
    } else if (xPosition === 'bottom') {
      icon.style.bottom = '0px';
    } else if (parseInt(yPosition) >= 0) {
      icon.style.top = yPosition + 'px';
    } else {
      icon.style.top = '0px';
    }

    if (typeof this.icons[i].iconViewTrackingUrl !== 'undefined') {
      icon.addEventListener('load', _onIconLoadPingTracking.bind(this, i));
    }

    if (typeof this.icons[i].iconClickThroughUrl !== 'undefined') {
      icon.addEventListener('click', _onIconClickThrough.bind(this, i));
    }

    icon.src = this.icons[i].staticResourceUrl;

    this.adContainer.appendChild(icon);
  }
};

ICONS.append = function () {
  this.onPlayingAppendIcons = _onPlayingAppendIcons.bind(this);
  // as per VAST 3 spec only append icon when ad starts playing
  this.vastPlayer.addEventListener('playing', this.onPlayingAppendIcons);
};

export { ICONS };