'use strict';
let currentYear = new Date().getFullYear();
let copyrightDate = document.querySelector(".copy-date");
copyrightDate.textContent = currentYear;

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);
    constructor(coordinates, distance, duration) {
        this.coordinates = coordinates;
        this.distance = distance;
        this.duration = duration;
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}, ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = "running";
    constructor(coordinates, distance, duration, cadence) {
        super(coordinates, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(pace) {
        this.pace = this.duration / this.distance;
        return pace;
    }
}

class Cycling extends Workout {
    type = "cycling";
    constructor(coordinates, distance, duration, elevationGain) {
        super(coordinates, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed(speed) {
        this.speed = this.distance / (this.duration / 60);
        return speed;
    }
}

class App {
    #map;
    #mapEvent;
    #workouts = [];

    constructor() {
        this._getPosition();
        this._getLocalStorage();
        form.addEventListener("submit", this._newWorkout.bind(this));
        inputType.addEventListener("change", this._toggleElevationField);
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                alert("Could not get your location!");
            });
        };
    }

    _loadMap(position) {
        const latitude = position.coords.latitude;
        const longtitude = position.coords.longitude;
        console.log(`https://www.google.ru/maps/place/@${latitude},${longtitude}`)

        const coordinates = [latitude, longtitude];
        this.#map = L.map('map').setView(coordinates, 13);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on("click", this._showForm.bind(this));
        this.#workouts.forEach(workout => {
            this._renderWorkoutMarker(workout);
        })
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }

    _hideForm() {
        inputType.value = inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = "";
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(function () {
            return form.style.display = "grid"
        }, 1000);
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coordinates).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 300,
                minWidth: 100,
                maxHeight: 200,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            })).setPopupContent(`${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.description}`).openPopup();
    }

    _toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }

    _newWorkout(e) {
        e.preventDefault();
        let workout;

        const positiveInputs = (...inputs) => {
            inputs.every(input => {
                input > 0;
            })
        }
        // Get data from form inputs
        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        const { lat, lng } = this.#mapEvent.latlng;

        // If workout running, create running object
        if (type === "running") {
            // Validate data
            const cadence = Number(inputCadence.value);
            if (
                !Number.isFinite(distance)
                || !Number.isFinite(duration)
                || !Number.isFinite(cadence)
                || positiveInputs(distance, duration, cadence)
            ) return alert("Inputs have to be a positive numbers!");

            workout = new Running([lat, lng], distance, duration, cadence);
        }
        // If working cycling, create cycling object
        if (type === "cycling") {
            const elevation = Number(inputElevation.value);

            workout = new Cycling([lat, lng], distance, duration, elevation);
        }
        // Add new object to workout array
        this.#workouts.push(workout);
        console.log(workout)
        // Render workout on list
        this._renderWorkout(workout);
        // Render workout marker on the map
        this._renderWorkoutMarker(workout);
        // Hide form and clear inputs
        this._hideForm();
        // Local Storage
        this._setLocalStorage();
    }

    _renderWorkout(workout) {
        let workoutHTML = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
            <span class="workout__icon">${workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
        </div>
        `;

        if (workout.type === "running") {
            workoutHTML += `
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
        </li>`
        };

        if (workout.type === "cycling") {
            workoutHTML += `
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
        </li>`;
        }
        form.insertAdjacentHTML("afterend", workoutHTML);
    }

    _moveToPopup(e) {
        const workoutElement = e.target.closest('.workout');
        console.log(workoutElement);

        if (!workoutElement) return;

        const workout = this.#workouts.find(
            work => work.id === workoutElement.dataset.id
        );
        console.log(workout);

        this.#map.setView(workout.coordinates, 13, {
            animate: true,
            pan: {
                duration: 1,
            },
        });
    }
    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts))
    }
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        console.log(data);
        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(workout => {
            this._renderWorkout(workout);
        });
    }
}

const app = new App();