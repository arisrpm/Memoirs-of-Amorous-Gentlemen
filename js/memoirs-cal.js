(() => {
	'use strict';

	/**
	 * Memoirs of Amorous Gentlemen
	 * Performance Calendar
	 *
	 * Data source:
	 * Memoirs.getObjects('Calendar')
	 *
	 * The Calendar tab currently mirrors the client-provided
	 * TodayTix performance schedule.
	 */

	const Memoirs = window.Memoirs;

	if (!Memoirs) {
		console.error(
			'[Memoirs Calendar] Memoirs core is not available.'
		);

		return;
	}

	// ------------------------------------------------------------
	// CONFIG
	// ------------------------------------------------------------

	const config = {
		sheetName: 'Calendar',
		selector: '#moag-calendar',
		timeZone: 'America/New_York',
		debug: true,
	};

	// ------------------------------------------------------------
	// STATE
	// ------------------------------------------------------------

	const state = {
		element: null,
		performances: [],
		performancesByDate: new Map(),
		firstPerformance: null,
		lastPerformance: null,
		currentMonth: null,
	};

	// ------------------------------------------------------------
	// LOGGING
	// ------------------------------------------------------------

	function log(...args) {
		if (!config.debug) return;

		console.log('[Memoirs Calendar]', ...args);
	}

	function warn(...args) {
		console.warn('[Memoirs Calendar]', ...args);
	}

	function error(...args) {
		console.error('[Memoirs Calendar]', ...args);
	}

	// ------------------------------------------------------------
	// INIT
	// ------------------------------------------------------------

	async function init() {
		state.element =
			document.querySelector(config.selector);

		if (!state.element) {
			return;
		}

		log('Initialized');

		renderLoading();

		try {
			const rows =
				await Memoirs.getObjects(
					config.sheetName
				);

			log('Raw calendar rows:', rows);

			state.performances =
				normalizePerformances(rows);

			if (!state.performances.length) {
				throw new Error(
					'No valid calendar performances found.'
				);
			}

			buildPerformanceIndex();
			setPerformanceRange();
			setInitialMonth();

			render();

			log(
				'Loaded performances:',
				state.performances
			);
		} catch (err) {
			error(
				'Unable to initialize calendar.',
				err
			);

			renderError();
		}
	}

	// ------------------------------------------------------------
	// NORMALIZE SHEET DATA
	// ------------------------------------------------------------

	function normalizePerformances(rows) {
		return rows
			.map(row => {
				const date =
					parseDate(row.show_date);

				const time =
					cleanTime(row.show_time_et);

				if (!date || !time) {
					return null;
				}

				return {
					date,
					dateKey: getDateKey(date),

					day:
						row.day || '',

					time,

					url:
						row.seating_chart_url || '',

					showtimeId:
						row.showtime_id || '',

					bestAvailable:
						parseBoolean(
							row.best_available
						),
				};
			})
			.filter(Boolean)
			.sort((a, b) => {
				const dateDifference =
					a.date - b.date;

				if (dateDifference !== 0) {
					return dateDifference;
				}

				return (
					timeToMinutes(a.time) -
					timeToMinutes(b.time)
				);
			});
	}

	// ------------------------------------------------------------
	// DATE HELPERS
	// ------------------------------------------------------------

	function parseDate(value) {
		if (!value) {
			return null;
		}

		const string =
			String(value).trim();

		/**
		 * Client sheet currently uses:
		 *
		 * YYYY-MM-DD
		 */
		const isoMatch =
			string.match(
				/^(\d{4})-(\d{1,2})-(\d{1,2})$/
			);

		if (isoMatch) {
			return new Date(
				Number(isoMatch[1]),
				Number(isoMatch[2]) - 1,
				Number(isoMatch[3]),
				12
			);
		}

		/**
		 * Also support:
		 *
		 * M/D/YYYY
		 */
		const slashMatch =
			string.match(
				/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
			);

		if (slashMatch) {
			return new Date(
				Number(slashMatch[3]),
				Number(slashMatch[1]) - 1,
				Number(slashMatch[2]),
				12
			);
		}

		warn(
			'Unable to parse date:',
			value
		);

		return null;
	}

	function getDateKey(date) {
		const year =
			date.getFullYear();

		const month =
			String(
				date.getMonth() + 1
			).padStart(2, '0');

		const day =
			String(
				date.getDate()
			).padStart(2, '0');

		return `${year}-${month}-${day}`;
	}

	function startOfMonth(date) {
		return new Date(
			date.getFullYear(),
			date.getMonth(),
			1,
			12
		);
	}

	function addMonths(date, amount) {
		return new Date(
			date.getFullYear(),
			date.getMonth() + amount,
			1,
			12
		);
	}

	function getToday() {
		const formatter =
			new Intl.DateTimeFormat(
				'en-US',
				{
					timeZone:
						config.timeZone,

					year: 'numeric',
					month: 'numeric',
					day: 'numeric',
				}
			);

		const parts =
			formatter.formatToParts(
				new Date()
			);

		const values = {};

		parts.forEach(part => {
			if (part.type === 'literal') {
				return;
			}

			values[part.type] =
				Number(part.value);
		});

		return new Date(
			values.year,
			values.month - 1,
			values.day,
			12
		);
	}

	function isSameDay(a, b) {
		return (
			a.getFullYear() ===
				b.getFullYear() &&

			a.getMonth() ===
				b.getMonth() &&

			a.getDate() ===
				b.getDate()
		);
	}

	function isWithinPerformanceRange(date) {
		if (
			!state.firstPerformance ||
			!state.lastPerformance
		) {
			return false;
		}

		return (
			date >= state.firstPerformance &&
			date <= state.lastPerformance
		);
	}

	// ------------------------------------------------------------
	// TIME HELPERS
	// ------------------------------------------------------------

	function cleanTime(value) {
		return String(value || '')
			.trim()
			.replace(/\s+/g, ' ')
			.toUpperCase();
	}

	function timeToMinutes(value) {
		const match =
			String(value || '')
				.trim()
				.match(
					/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i
				);

		if (!match) {
			return Number.MAX_SAFE_INTEGER;
		}

		let hour =
			Number(match[1]);

		const minute =
			Number(match[2] || 0);

		const meridiem =
			match[3].toUpperCase();

		if (hour === 12) {
			hour = 0;
		}

		if (meridiem === 'PM') {
			hour += 12;
		}

		return (
			hour * 60 +
			minute
		);
	}

	function parseBoolean(value) {
		return [
			'true',
			'yes',
			'y',
			'1',
			'checked',
		].includes(
			String(value || '')
				.trim()
				.toLowerCase()
		);
	}

	// ------------------------------------------------------------
	// PERFORMANCE INDEX
	// ------------------------------------------------------------

	function buildPerformanceIndex() {
		state.performancesByDate =
			new Map();

		state.performances.forEach(
			performance => {
				if (
					!state.performancesByDate.has(
						performance.dateKey
					)
				) {
					state.performancesByDate.set(
						performance.dateKey,
						[]
					);
				}

				state.performancesByDate
					.get(performance.dateKey)
					.push(performance);
			}
		);
	}

	function setPerformanceRange() {
		state.firstPerformance =
			new Date(
				state.performances[0]
					.date
					.getTime()
			);

		state.lastPerformance =
			new Date(
				state.performances[
					state.performances.length - 1
				]
					.date
					.getTime()
			);

		log(
			'Performance range:',
			state.firstPerformance,
			'→',
			state.lastPerformance
		);
	}

	function setInitialMonth() {
		const today =
			getToday();

		const currentMonth =
			startOfMonth(today);

		const firstMonth =
			startOfMonth(
				state.firstPerformance
			);

		const lastMonth =
			startOfMonth(
				state.lastPerformance
			);

		if (currentMonth < firstMonth) {
			state.currentMonth =
				firstMonth;

			return;
		}

		if (currentMonth > lastMonth) {
			state.currentMonth =
				lastMonth;

			return;
		}

		state.currentMonth =
			currentMonth;
	}

	// ------------------------------------------------------------
	// MAIN RENDER
	// ------------------------------------------------------------

	function render() {
		state.element.innerHTML = '';

		const calendar =
			document.createElement('div');

		calendar.className =
			'moag-calendar__inner';

		calendar.appendChild(
			renderHeader()
		);

		calendar.appendChild(
			renderWeekdays()
		);

		calendar.appendChild(
			renderGrid()
		);

		state.element.appendChild(
			calendar
		);

		bindNavigation();
	}

	// ------------------------------------------------------------
	// HEADER
	// ------------------------------------------------------------

	function renderHeader() {
		const header =
			document.createElement('div');

		header.className =
			'moag-calendar__header';

		const previous =
			createNavigationButton(
				'prev',
				'Previous month',
				'←'
			);

		const title =
			document.createElement('h2');

		title.className =
			'moag-calendar__title';

		title.textContent =
			state.currentMonth
				.toLocaleDateString(
					'en-US',
					{
						month: 'long',
						year: 'numeric',
					}
				)
				.toUpperCase();

		const next =
			createNavigationButton(
				'next',
				'Next month',
				'→'
			);

		previous.disabled =
			!canNavigate(-1);

		next.disabled =
			!canNavigate(1);

		header.append(
			previous,
			title,
			next
		);

		return header;
	}

	function createNavigationButton(
		action,
		label,
		symbol
	) {
		const button =
			document.createElement(
				'button'
			);

		button.type = 'button';

		button.className =
			`moag-calendar__nav ` +
			`moag-calendar__nav--${action}`;

		button.dataset.calendarAction =
			action;

		button.setAttribute(
			'aria-label',
			label
		);

		button.innerHTML =
			`<span aria-hidden="true">` +
			`${symbol}` +
			`</span>`;

		return button;
	}

	// ------------------------------------------------------------
	// WEEKDAYS
	// ------------------------------------------------------------

	function renderWeekdays() {
		const container =
			document.createElement('div');

		container.className =
			'moag-calendar__weekdays';

		const weekdays = [
			'SUNDAY',
			'MONDAY',
			'TUESDAY',
			'WEDNESDAY',
			'THURSDAY',
			'FRIDAY',
			'SATURDAY',
		];

		weekdays.forEach(day => {
			const element =
				document.createElement(
					'div'
				);

			element.className =
				'moag-calendar__weekday';

			element.textContent =
				day;

			container.appendChild(
				element
			);
		});

		return container;
	}

	// ------------------------------------------------------------
	// MONTH GRID
	// ------------------------------------------------------------

	function renderGrid() {
		const grid =
			document.createElement('div');

		grid.className =
			'moag-calendar__grid';

		const year =
			state.currentMonth
				.getFullYear();

		const month =
			state.currentMonth
				.getMonth();

		const firstDate =
			new Date(
				year,
				month,
				1,
				12
			);

		const daysInMonth =
			new Date(
				year,
				month + 1,
				0,
				12
			).getDate();

		const leadingCells =
			firstDate.getDay();

		const usedCells =
			leadingCells +
			daysInMonth;

		const totalCells =
			Math.ceil(
				usedCells / 7
			) * 7;

		for (
			let index = 0;
			index < totalCells;
			index++
		) {
			const dayNumber =
				index -
				leadingCells +
				1;

			if (
				dayNumber < 1 ||
				dayNumber > daysInMonth
			) {
				grid.appendChild(
					renderOutsideDay()
				);

				continue;
			}

			const date =
				new Date(
					year,
					month,
					dayNumber,
					12
				);

			grid.appendChild(
				renderDay(date)
			);
		}

		return grid;
	}

	function renderOutsideDay() {
		const cell =
			document.createElement('div');

		cell.className =
			'moag-calendar__day ' +
			'moag-calendar__day--outside';

		cell.setAttribute(
			'aria-hidden',
			'true'
		);

		return cell;
	}

	// ------------------------------------------------------------
	// DAY
	// ------------------------------------------------------------

	function renderDay(date) {
		const dateKey =
			getDateKey(date);

		const performances =
			state.performancesByDate.get(
				dateKey
			) || [];

		const cell =
			document.createElement('div');

		cell.className =
			'moag-calendar__day';

		cell.dataset.date =
			dateKey;

		if (
			isSameDay(
				date,
				getToday()
			)
		) {
			cell.classList.add(
				'moag-calendar__day--today'
			);
		}

		const dateNumber =
			document.createElement('div');

		dateNumber.className =
			'moag-calendar__date';

        dateNumber.innerHTML =
            `<span class="moag-calendar__date-weekday">` +
            date
                .toLocaleDateString('en-US', {
                    weekday: 'short',
                })
                .toUpperCase() +
            `</span>` +
            `<span class="moag-calendar__date-full">` +
            date
                .toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                })
                .toUpperCase() +
            `</span>` +
            `<span class="moag-calendar__date-number">` +
            date.getDate() +
            `</span>`;

		cell.appendChild(
			dateNumber
		);

		const content =
			document.createElement('div');

		content.className =
			'moag-calendar__day-content';

		// --------------------------------------------------------
		// SHOWS
		// --------------------------------------------------------

		if (performances.length) {
			cell.classList.add(
				'moag-calendar__day--shows'
			);

			performances.forEach(
				performance => {
					content.appendChild(
						renderPerformance(
							performance
						)
					);
				}
			);
		}

		// --------------------------------------------------------
		// DARK
		// --------------------------------------------------------

		else if (
			isWithinPerformanceRange(
				date
			)
		) {
			cell.classList.add(
				'moag-calendar__day--dark'
			);

			const dark =
				document.createElement(
					'span'
				);

			dark.className =
				'moag-calendar__dark';

			dark.textContent =
				'DARK';

			content.appendChild(
				dark
			);
		}

		// --------------------------------------------------------
		// BLANK
		// --------------------------------------------------------

		else {
			cell.classList.add(
				'moag-calendar__day--blank'
			);
		}

		cell.appendChild(
			content
		);

		return cell;
	}

	// ------------------------------------------------------------
	// PERFORMANCE
	// ------------------------------------------------------------

	function renderPerformance(
		performance
	) {
		const hasUrl =
			Memoirs.isValidUrl(
				performance.url
			);

		const element =
			document.createElement(
				hasUrl
					? 'a'
					: 'span'
			);

		element.className =
			'moag-calendar__showtime';

		element.textContent =
			performance.time;

		if (performance.showtimeId) {
			element.dataset.showtimeId =
				performance.showtimeId;
		}

		element.dataset.bestAvailable =
			performance.bestAvailable
				? 'true'
				: 'false';

		if (hasUrl) {
			element.href =
				performance.url;
		}

		return element;
	}

	// ------------------------------------------------------------
	// NAVIGATION
	// ------------------------------------------------------------

	function canNavigate(direction) {
		const target =
			addMonths(
				state.currentMonth,
				direction
			);

		const firstMonth =
			startOfMonth(
				state.firstPerformance
			);

		const lastMonth =
			startOfMonth(
				state.lastPerformance
			);

		return (
			target >= firstMonth &&
			target <= lastMonth
		);
	}

	function changeMonth(direction) {
		if (!canNavigate(direction)) {
			return;
		}

		state.currentMonth =
			addMonths(
				state.currentMonth,
				direction
			);

		render();
	}

	function bindNavigation() {
		state.element
			.querySelectorAll(
				'[data-calendar-action]'
			)
			.forEach(button => {
				button.addEventListener(
					'click',
					() => {
						const action =
							button.dataset
								.calendarAction;

						changeMonth(
							action === 'next'
								? 1
								: -1
						);
					}
				);
			});
	}

	// ------------------------------------------------------------
	// STATES
	// ------------------------------------------------------------

	function renderLoading() {
		state.element.innerHTML =
			'<div class="moag-calendar__loading">' +
			'Loading performances&hellip;' +
			'</div>';
	}

	function renderError() {
		state.element.innerHTML =
			'<div class="moag-calendar__error">' +
			'Performance calendar is temporarily unavailable.' +
			'</div>';
	}

	// ------------------------------------------------------------
	// START
	// ------------------------------------------------------------

	Memoirs.ready(init);

})();