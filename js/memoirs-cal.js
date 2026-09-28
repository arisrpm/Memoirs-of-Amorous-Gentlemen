(function (window, document) {
	'use strict';

	const Memoirs = window.Memoirs = window.Memoirs || {};

	Memoirs.Calendar = {

		config: {
			sheetId: '1rssjXwCtP5YJhXslXl54JXCXenOXMXSCKHK0qD9OYlg',
			gid: '1602034860',

			// Sheet is using Eastern Time.
			timeZone: 'America/New_York'
		},

		state: {
			performances: [],
			performancesByDate: new Map(),
			runStart: null,
			runEnd: null,
			currentMonth: null
		},

		init() {
			this.calendar = document.querySelector('#moag-calendar');

			if (!this.calendar) {
				return;
			}

			console.log('[Memoirs Calendar] Initialized');

			this.renderLoading();

			this.fetchPerformances()
				.then((performances) => {
					if (!performances.length) {
						throw new Error('No valid performances found in calendar sheet.');
					}

					this.state.performances = performances;

					this.buildPerformanceIndex();
					this.setRunDates();
					this.setInitialMonth();
					this.render();

					console.log(
						'[Memoirs Calendar] Loaded performances:',
						performances
					);
				})
				.catch((error) => {
					console.error('[Memoirs Calendar] Error:', error);
					this.renderError();
				});
		},

		/* ------------------------------------------------------------
		 * SHEET
		 * ------------------------------------------------------------ */

		getSheetUrl() {
			const { sheetId, gid } = this.config;

			return (
				'https://docs.google.com/spreadsheets/d/' +
				encodeURIComponent(sheetId) +
				'/gviz/tq?tqx=out:csv&gid=' +
				encodeURIComponent(gid)
			);
		},

		async fetchPerformances() {
			const url = this.getSheetUrl();

			console.log('[Memoirs Calendar] Fetching sheet:', url);

			const response = await fetch(url, {
				method: 'GET',
				cache: 'no-store'
			});

			if (!response.ok) {
				throw new Error(
					'Calendar sheet request failed: ' +
					response.status +
					' ' +
					response.statusText
				);
			}

			const csv = await response.text();
			const rows = this.parseCSV(csv);

			if (rows.length < 2) {
				return [];
			}

			return this.rowsToPerformances(rows);
		},

		parseCSV(text) {
			const rows = [];

			let row = [];
			let field = '';
			let insideQuotes = false;

			for (let i = 0; i < text.length; i++) {
				const char = text[i];
				const next = text[i + 1];

				if (char === '"') {
					if (insideQuotes && next === '"') {
						field += '"';
						i++;
					} else {
						insideQuotes = !insideQuotes;
					}

					continue;
				}

				if (char === ',' && !insideQuotes) {
					row.push(field);
					field = '';
					continue;
				}

				if (
					(char === '\n' || char === '\r') &&
					!insideQuotes
				) {
					if (char === '\r' && next === '\n') {
						i++;
					}

					row.push(field);

					if (row.some((value) => value.trim() !== '')) {
						rows.push(row);
					}

					row = [];
					field = '';
					continue;
				}

				field += char;
			}

			row.push(field);

			if (row.some((value) => value.trim() !== '')) {
				rows.push(row);
			}

			return rows;
		},

		rowsToPerformances(rows) {
			const headers = rows[0].map((header) =>
				this.normalizeHeader(header)
			);

			console.log('[Memoirs Calendar] Headers:', headers);

			const indexes = {
				date: this.findHeader(headers, [
					'show date',
					'date'
				]),

				day: this.findHeader(headers, [
					'day'
				]),

				time: this.findHeader(headers, [
					'show time et',
					'show time',
					'time'
				]),

				url: this.findHeader(headers, [
					'seating chart url',
					'seating chart',
					'url'
				]),

				showtimeId: this.findHeader(headers, [
					'showtime id',
					'showtimeid'
				]),

				bestAvailable: this.findHeader(headers, [
					'best available'
				])
			};

			if (indexes.date === -1 || indexes.time === -1) {
				throw new Error(
					'Required Show date / Show time columns were not found.'
				);
			}

			return rows
				.slice(1)
				.map((row) => {
					const rawDate = this.getCell(row, indexes.date);
					const rawTime = this.getCell(row, indexes.time);

					if (!rawDate || !rawTime) {
						return null;
					}

					const date = this.parseSheetDate(rawDate);

					if (!date) {
						console.warn(
							'[Memoirs Calendar] Could not parse date:',
							rawDate
						);

						return null;
					}

					return {
						date,
						dateKey: this.dateKey(date),

						day: this.getCell(row, indexes.day),

						time: this.cleanTime(rawTime),

						url: this.getCell(row, indexes.url),

						showtimeId: this.getCell(
							row,
							indexes.showtimeId
						),

						bestAvailable: this.parseBoolean(
							this.getCell(
								row,
								indexes.bestAvailable
							)
						)
					};
				})
				.filter(Boolean)
				.sort((a, b) => {
					const dateDiff = a.date - b.date;

					if (dateDiff !== 0) {
						return dateDiff;
					}

					return (
						this.timeToMinutes(a.time) -
						this.timeToMinutes(b.time)
					);
				});
		},

		normalizeHeader(value) {
			return String(value || '')
				.trim()
				.toLowerCase()
				.replace(/[()]/g, '')
				.replace(/\s+/g, ' ');
		},

		findHeader(headers, possibilities) {
			for (const possibility of possibilities) {
				const index = headers.indexOf(possibility);

				if (index !== -1) {
					return index;
				}
			}

			return -1;
		},

		getCell(row, index) {
			if (index === -1 || typeof row[index] === 'undefined') {
				return '';
			}

			return String(row[index]).trim();
		},

		parseBoolean(value) {
			const normalized = String(value || '')
				.trim()
				.toLowerCase();

			return [
				'true',
				'yes',
				'y',
				'1',
				'checked'
			].includes(normalized);
		},

		/* ------------------------------------------------------------
		 * DATES
		 * ------------------------------------------------------------ */

		parseSheetDate(value) {
			const cleaned = String(value || '').trim();

			if (!cleaned) {
				return null;
			}

			/*
			 * Handles:
			 * 9/29/2026
			 * 09/29/2026
			 * 9/29/26
			 */
			const slashMatch = cleaned.match(
				/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/
			);

			if (slashMatch) {
				let year = Number(slashMatch[3]);

				if (year < 100) {
					year += 2000;
				}

				return new Date(
					year,
					Number(slashMatch[1]) - 1,
					Number(slashMatch[2]),
					12,
					0,
					0
				);
			}

			/*
			 * Handles ISO-ish dates if Google gives us those instead.
			 */
			const isoMatch = cleaned.match(
				/^(\d{4})-(\d{1,2})-(\d{1,2})$/
			);

			if (isoMatch) {
				return new Date(
					Number(isoMatch[1]),
					Number(isoMatch[2]) - 1,
					Number(isoMatch[3]),
					12,
					0,
					0
				);
			}

			/*
			 * Final fallback.
			 */
			const fallback = new Date(cleaned);

			if (Number.isNaN(fallback.getTime())) {
				return null;
			}

			return new Date(
				fallback.getFullYear(),
				fallback.getMonth(),
				fallback.getDate(),
				12,
				0,
				0
			);
		},

		dateKey(date) {
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');

			return `${year}-${month}-${day}`;
		},

		monthKey(date) {
			return (
				date.getFullYear() +
				'-' +
				String(date.getMonth() + 1).padStart(2, '0')
			);
		},

		startOfMonth(date) {
			return new Date(
				date.getFullYear(),
				date.getMonth(),
				1,
				12
			);
		},

		endOfMonth(date) {
			return new Date(
				date.getFullYear(),
				date.getMonth() + 1,
				0,
				12
			);
		},

		addMonths(date, amount) {
			return new Date(
				date.getFullYear(),
				date.getMonth() + amount,
				1,
				12
			);
		},

		isSameDay(a, b) {
			return (
				a.getFullYear() === b.getFullYear() &&
				a.getMonth() === b.getMonth() &&
				a.getDate() === b.getDate()
			);
		},

		isWithinRun(date) {
			if (!this.state.runStart || !this.state.runEnd) {
				return false;
			}

			return (
				date >= this.state.runStart &&
				date <= this.state.runEnd
			);
		},

		getToday() {
			/*
			 * Build "today" using Eastern Time so a visitor in another
			 * timezone doesn't accidentally flip the calendar early.
			 */
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: this.config.timeZone,
				year: 'numeric',
				month: 'numeric',
				day: 'numeric'
			});

			const parts = formatter.formatToParts(new Date());

			const values = {};

			parts.forEach((part) => {
				if (part.type !== 'literal') {
					values[part.type] = Number(part.value);
				}
			});

			return new Date(
				values.year,
				values.month - 1,
				values.day,
				12
			);
		},

		/* ------------------------------------------------------------
		 * PERFORMANCE INDEX
		 * ------------------------------------------------------------ */

		buildPerformanceIndex() {
			const map = new Map();

			this.state.performances.forEach((performance) => {
				if (!map.has(performance.dateKey)) {
					map.set(performance.dateKey, []);
				}

				map.get(performance.dateKey).push(performance);
			});

			this.state.performancesByDate = map;
		},

		setRunDates() {
			const performances = this.state.performances;

			this.state.runStart = new Date(
				performances[0].date.getTime()
			);

			this.state.runEnd = new Date(
				performances[performances.length - 1].date.getTime()
			);

			console.log(
				'[Memoirs Calendar] Run:',
				this.state.runStart,
				'→',
				this.state.runEnd
			);
		},

		setInitialMonth() {
			const today = this.getToday();
			const todayMonth = this.startOfMonth(today);

			const firstMonth = this.startOfMonth(
				this.state.runStart
			);

			const lastMonth = this.startOfMonth(
				this.state.runEnd
			);

			if (todayMonth < firstMonth) {
				this.state.currentMonth = firstMonth;
				return;
			}

			if (todayMonth > lastMonth) {
				this.state.currentMonth = lastMonth;
				return;
			}

			this.state.currentMonth = todayMonth;
		},

		/* ------------------------------------------------------------
		 * RENDER
		 * ------------------------------------------------------------ */

		render() {
			const month = this.state.currentMonth;

			this.calendar.innerHTML = '';

			this.calendar.appendChild(
				this.renderHeader(month)
			);

			this.calendar.appendChild(
				this.renderWeekdays()
			);

			this.calendar.appendChild(
				this.renderGrid(month)
			);

			this.bindEvents();
		},

		renderHeader(month) {
			const header = document.createElement('div');
			header.className = 'moag-calendar__header';

			const prev = document.createElement('button');
			prev.type = 'button';
			prev.className =
				'moag-calendar__nav moag-calendar__nav--prev';
			prev.dataset.calendarAction = 'prev';
			prev.setAttribute('aria-label', 'Previous month');
			prev.innerHTML =
				'<span aria-hidden="true">&larr;</span>';

			const title = document.createElement('h2');
			title.className = 'moag-calendar__title';

			title.textContent = month
				.toLocaleDateString('en-US', {
					month: 'long',
					year: 'numeric'
				})
				.toUpperCase();

			const next = document.createElement('button');
			next.type = 'button';
			next.className =
				'moag-calendar__nav moag-calendar__nav--next';
			next.dataset.calendarAction = 'next';
			next.setAttribute('aria-label', 'Next month');
			next.innerHTML =
				'<span aria-hidden="true">&rarr;</span>';

			prev.disabled = !this.canNavigate(-1);
			next.disabled = !this.canNavigate(1);

			header.append(prev, title, next);

			return header;
		},

		renderWeekdays() {
			const weekdays = document.createElement('div');
			weekdays.className = 'moag-calendar__weekdays';

			[
				'SUNDAY',
				'MONDAY',
				'TUESDAY',
				'WEDNESDAY',
				'THURSDAY',
				'FRIDAY',
				'SATURDAY'
			].forEach((day) => {
				const item = document.createElement('div');

				item.className =
					'moag-calendar__weekday';

				item.textContent = day;

				weekdays.appendChild(item);
			});

			return weekdays;
		},

		renderGrid(month) {
			const grid = document.createElement('div');
			grid.className = 'moag-calendar__grid';

			const year = month.getFullYear();
			const monthIndex = month.getMonth();

			const firstDate = new Date(
				year,
				monthIndex,
				1,
				12
			);

			const daysInMonth = new Date(
				year,
				monthIndex + 1,
				0
			).getDate();

			const leadingBlanks = firstDate.getDay();

			/*
			 * We render complete weeks so the month always retains
			 * a proper calendar shape.
			 */
			const requiredCells =
				leadingBlanks + daysInMonth;

			const totalCells =
				Math.ceil(requiredCells / 7) * 7;

			for (let index = 0; index < totalCells; index++) {
				const dayNumber =
					index - leadingBlanks + 1;

				if (
					dayNumber < 1 ||
					dayNumber > daysInMonth
				) {
					grid.appendChild(
						this.renderEmptyCell()
					);

					continue;
				}

				const date = new Date(
					year,
					monthIndex,
					dayNumber,
					12
				);

				grid.appendChild(
					this.renderDay(date)
				);
			}

			return grid;
		},

		renderEmptyCell() {
			const cell = document.createElement('div');

			cell.className =
				'moag-calendar__day ' +
				'moag-calendar__day--outside';

			cell.setAttribute('aria-hidden', 'true');

			return cell;
		},

		renderDay(date) {
			const dateKey = this.dateKey(date);

			const performances =
				this.state.performancesByDate.get(dateKey) || [];

			const cell = document.createElement('div');

			cell.className = 'moag-calendar__day';
			cell.dataset.date = dateKey;

			if (this.isSameDay(date, this.getToday())) {
				cell.classList.add(
					'moag-calendar__day--today'
				);
			}

			const number = document.createElement('div');

			number.className =
				'moag-calendar__date';

			number.textContent = date.getDate();

			cell.appendChild(number);

			const content = document.createElement('div');

			content.className =
				'moag-calendar__day-content';

			if (performances.length) {
				cell.classList.add(
					'moag-calendar__day--shows'
				);

				performances.forEach((performance) => {
					content.appendChild(
						this.renderPerformance(performance)
					);
				});
			} else if (this.isWithinRun(date)) {
				cell.classList.add(
					'moag-calendar__day--dark'
				);

				const dark = document.createElement('span');

				dark.className =
					'moag-calendar__dark';

				dark.textContent = 'DARK';

				content.appendChild(dark);
			} else {
				cell.classList.add(
					'moag-calendar__day--blank'
				);
			}

			cell.appendChild(content);

			return cell;
		},

		renderPerformance(performance) {
			const hasUrl = Boolean(performance.url);

			const element = document.createElement(
				hasUrl ? 'a' : 'span'
			);

			element.className =
				'moag-calendar__showtime';

			element.textContent = performance.time;

			element.dataset.showtimeId =
				performance.showtimeId || '';

			element.dataset.bestAvailable =
				performance.bestAvailable
					? 'true'
					: 'false';

			if (hasUrl) {
				element.href = performance.url;

				/*
				 * Keep same-window navigation by default.
				 * If we decide ticketing should open a new tab,
				 * that's a one-line change.
				 */
			}

			return element;
		},

		renderLoading() {
			this.calendar.innerHTML =
				'<div class="moag-calendar__loading">' +
					'Loading performances&hellip;' +
				'</div>';
		},

		renderError() {
			this.calendar.innerHTML =
				'<div class="moag-calendar__error">' +
					'Performance calendar is temporarily unavailable.' +
				'</div>';
		},

		/* ------------------------------------------------------------
		 * NAVIGATION
		 * ------------------------------------------------------------ */

		canNavigate(direction) {
			const target = this.addMonths(
				this.state.currentMonth,
				direction
			);

			const firstMonth = this.startOfMonth(
				this.state.runStart
			);

			const lastMonth = this.startOfMonth(
				this.state.runEnd
			);

			return (
				target >= firstMonth &&
				target <= lastMonth
			);
		},

		changeMonth(direction) {
			if (!this.canNavigate(direction)) {
				return;
			}

			this.state.currentMonth = this.addMonths(
				this.state.currentMonth,
				direction
			);

			this.render();
		},

		bindEvents() {
			const prev = this.calendar.querySelector(
				'[data-calendar-action="prev"]'
			);

			const next = this.calendar.querySelector(
				'[data-calendar-action="next"]'
			);

			if (prev) {
				prev.addEventListener('click', () => {
					this.changeMonth(-1);
				});
			}

			if (next) {
				next.addEventListener('click', () => {
					this.changeMonth(1);
				});
			}
		},

		/* ------------------------------------------------------------
		 * TIME
		 * ------------------------------------------------------------ */

		cleanTime(value) {
			return String(value || '')
				.trim()
				.replace(/\s+/g, ' ')
				.toUpperCase();
		},

		timeToMinutes(value) {
			const match = String(value || '')
				.trim()
				.match(
					/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i
				);

			if (!match) {
				return Number.MAX_SAFE_INTEGER;
			}

			let hour = Number(match[1]);
			const minute = Number(match[2] || 0);
			const meridiem = match[3].toUpperCase();

			if (hour === 12) {
				hour = 0;
			}

			if (meridiem === 'PM') {
				hour += 12;
			}

			return hour * 60 + minute;
		}
	};

	function init() {
		Memoirs.Calendar.init();
	}

	if (document.readyState === 'loading') {
		document.addEventListener(
			'DOMContentLoaded',
			init
		);
	} else {
		init();
	}

})(window, document);