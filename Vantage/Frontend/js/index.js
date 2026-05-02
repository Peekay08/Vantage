
//Menu bar stuff
const button = document.getElementById('toggle');
const menubar = document.querySelector('.menu-bar');
const user = document.getElementById('user');

//stuff for profile for smaller devices
const userOpen = document.getElementById('user'); //profile button
const userClose = document.querySelector('.profilePopup i')// profile close button
const userprofile = document.querySelector('.profilePopup');//entire profile

//stuff for building information
const show = document.querySelectorAll('.show'); //show pop-up
const hide = document.getElementById('close-popup'); // hide pop-up
const popup = document.getElementById('pop-up'); // the pop-up
const overlay = document.getElementById('overlay'); //the overlay
const body = document.getElementsByTagName('body'); //the body


button.onclick = function () {
    menubar.classList.toggle('close');
};
window.addEventListener('load', (event) => {
    menubar.classList.toggle('close', window.matchMedia('(min-width:801px) and (max-width:1200px)').matches);
    user.classList.toggle('hidden', window.matchMedia('(min-width:900px)').matches);

});
window.addEventListener('resize', () => {
    menubar.classList.toggle('close', window.matchMedia('(min-width:801px) and (max-width:1200px)').matches);
        user.classList.toggle('hidden', window.matchMedia('(min-width:900px)').matches);

});

function showPopup() {
    popup.classList.remove('hidden');
    overlay.classList.remove('hidden');
    body.classList.add('no-scroll');
};
function hidePopup() {
    popup.classList.add('hidden');
    overlay.classList.add('hidden');
    body.classList.remove('no-scroll');
};
userOpen.onclick = function() {
    userprofile.classList.remove('hidden');
    overlay.classList.remove('hidden');

};
userClose.onclick = function() {
    userprofile.classList.add('hidden');
    overlay.classList.add('hidden');
};
show.forEach(element => {
    element.addEventListener('click', showPopup);
});
hide.addEventListener('click', hidePopup);






