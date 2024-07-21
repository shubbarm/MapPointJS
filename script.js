"use strict";

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in KM
    this.duration = duration; // in MIN
  }

  _setDesciption() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.desciption = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Walking extends Workout {
  type = "walking";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDesciption();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Biking extends Workout {
  type = "biking";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDesciption();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const walk1 = new Walking([39, -12], 5.2, 24, 178);
// const biking1 = new Biking([39, -12], 27, 95, 523);

// console.log(walk1, biking1);

// Application Architecture //////////
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach listeners
    form.addEventListener("submit", this._newWorkout.bind(this)); // just passing the _newWorkout, not calling it, also we bind 'this' to pass the correct 'App' association with this
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // binding this as this a regular call function, otherwise this in functions is undefined
        function () {
          alert("Could not get your position");
        }
      );
  }

  _loadMap(position) {
    // console.log(this);
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const cords = [latitude, longitude];

    //   console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    this.#map = L.map("map").setView(cords, this.#mapZoomLevel);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //   L.marker(cords)
    //     .addTo(map)
    //     .bindPopup("A pretty CSS popup.<br> Easily customizable.")
    //     .openPopup();

    this.#map.on("click", this._showForm.bind(this));

    // We have to call this method here not in _getLocalStorage() as the map need time to finish loading
    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    // helper validation method
    const isValidInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const isAllPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is walking, create walking object
    if (type === "walking") {
      const cadence = +inputCadence.value;
      // Check if data is valid
      // Guard clause, modern JS trend
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !isValidInputs(distance, duration, cadence) ||
        !isAllPositive(distance, duration, cadence)
      )
        return alert(`Inputs have to be positive numbers!`);

      workout = new Walking([lat, lng], distance, duration, cadence);
    }

    // If workout is biking, create a biking object
    if (type === "biking") {
      const elevation = +inputElevation.value;
      if (
        !isValidInputs(distance, duration, elevation) ||
        !isAllPositive(distance, duration)
      )
        return alert(`Inputs have to be positive numbers!`);

      workout = new Biking([lat, lng], distance, duration, elevation);
    }

    // Add new object to the workout array
    this.#workouts.push(workout);
    // console.log(workout);

    // Render workout on map as a marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input fields
    this._hideForm();
    // console.log(this.#mapEvent);

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "walking" ? "🏃‍♂️‍➡️" : "🚴‍♀️"} ${workout.desciption}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.desciption}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === "walking" ? "🏃‍♂️‍➡️" : "🚴‍♀️"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏰</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type == "walking")
      html += `
    
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
    `;

    if (workout.type == "biking")
      html += `
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
    `;

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );

    // console.log("dataset: ", workoutEl.dataset.id);
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;

    // Rendering in the list, we don't need new arrays so foreach is good
    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
// app._getPosition(); // or in the constructor
