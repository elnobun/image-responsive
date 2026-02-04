// =========================
// script.js
// =========================


const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const filenameCell = document.getElementById('filenameCell');
const dimensionCell = document.getElementById('dimensionCell');
const sizeCell = document.getElementById('sizeCell');
const fileTypeCell = document.getElementById('fileTypeCell');
const clearBtn = document.getElementById('clearBtn');


const widthsContainer = document.getElementById('widthsContainer');
const widthInput = document.getElementById('widthInput');
const addWidthBtn = document.getElementById('addWidthBtn');


const autoFromImageBtn = document.getElementById('autoFromImageBtn');
const autoFromRenderedBtn = document.getElementById('autoFromRenderedBtn');
const resetWidthsBtn = document.getElementById('resetWidthsBtn');


const altTextInput = document.getElementById('altTextInput');
const displayWidthInput = document.getElementById('displayWidthInput');


const generateBtn = document.getElementById('generateBtn');
const rightPanel = document.getElementById('rightPanel');
const progressSection = document.getElementById('progressSection');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const resultsSection = document.getElementById('resultsSection');
const resultsInfo = document.getElementById('resultsInfo');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const htmlCode = document.getElementById('htmlCode');
const safariNotice = document.getElementById('safariNotice');

// Default: empty until a file is uploaded
let targetWidths = [];
let lastAutoWidths = [];


// Detect Safari and adjust quality
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const QUALITY = isSafari ? 0.55 : 0.7;
if (isSafari) safariNotice.classList.add('active');


let uploadedFile = null;
let originalImage = null; // HTMLImageElement
let generatedImages = []; // { filename, width, height, blob, size, isOriginal? }
let htmlMarkup = '';

// ------------------------------
// Helpers
// ------------------------------


function getBaseName(filename) {
	const lastDot = filename.lastIndexOf('.');
	return lastDot === -1 ? filename : filename.slice(0, lastDot);
}


function getExt(filename) {
	const lastDot = filename.lastIndexOf('.');
	return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase();
}


function uniqueSortedNumbers(arr) {
	return [...new Set(arr.map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n > 0))]
		.sort((a, b) => a - b);
}


function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}


// function niceRound(n) {
// 	// keep numbers looking normal in UI
// 	if (n < 250) return Math.round(n / 10) * 10;
// 	if (n < 800) return Math.round(n / 25) * 25;
// 	return Math.round(n / 50) * 50;
// }

function niceRound(n) {
	if (n < 500) return Math.round(n / 10) * 10;
	if (n < 900) return Math.round(n / 25) * 25;
	return Math.round(n / 50) * 50;
}


function generateWidthsFromOriginal(originalWidth) {
	const w = parseInt(originalWidth, 10);
	if (!Number.isFinite(w) || w <= 0) return [];


	const ratios = w <= 420 ? [0.5, 0.8, 1] : [0.25, 0.5, 0.75, 1];


	const widths = ratios
		.map(r => niceRound(w * r))
		.map(x => clamp(x, 160, w))
		.filter(x => x <= w);


	const unique = uniqueSortedNumbers(widths);
	if (!unique.includes(w)) unique.push(w);
	return uniqueSortedNumbers(unique);
}

function generateWidthsFromRendered(renderedWidth, originalWidth) {
	const r = parseInt(renderedWidth, 10);
	const o = parseInt(originalWidth, 10);
	if (!Number.isFinite(r) || r <= 0 || !Number.isFinite(o) || o <= 0) return [];


	const candidates = [
		niceRound(r * 0.6),
		niceRound(r),
		o,
	].map(x => clamp(x, 160, o));


	// Ensure the rendered width itself is included (if <= original)
	if (r <= o) candidates.push(r);


	return uniqueSortedNumbers(candidates);
}


function pickRenderedWidth(sortedCandidateWidths) {
	const desktopRenderedWidth = parseInt(displayWidthInput?.value, 10);
	if (Number.isFinite(desktopRenderedWidth) && desktopRenderedWidth > 0) return desktopRenderedWidth;


	// Your preference: blank => original/largest
	return sortedCandidateWidths[sortedCandidateWidths.length - 1] || 0;
}


function buildAltText(baseName) {
	const manual = altTextInput.value.trim();
	if (manual) return manual;
	return baseName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}


function formatKB(bytes) {
	return (bytes / 1024).toFixed(2);
}


function setTargetWidths(widths) {
	targetWidths = uniqueSortedNumbers(widths);
	lastAutoWidths = [...targetWidths];
	renderWidths();
}

// ------------------------------
// Width UI
// ------------------------------


function renderWidths() {
	widthsContainer.innerHTML = '';


	const widths = uniqueSortedNumbers(targetWidths);
	widths.forEach(width => {
		const tag = document.createElement('div');
		tag.className = 'width-tag';
		tag.innerHTML = `${width}<button class="width-remove" data-width="${width}">×</button>`;
		widthsContainer.appendChild(tag);
	});


	document.querySelectorAll('.width-remove').forEach(btn => {
		btn.addEventListener('click', (e) => {
			const width = parseInt(e.target.dataset.width, 10);
			targetWidths = targetWidths.filter(w => w !== width);
			renderWidths();
		});
	});
}

addWidthBtn.addEventListener('click', () => {
	const width = parseInt(widthInput.value, 10);
	if (Number.isFinite(width) && width > 0 && !targetWidths.includes(width)) {
		targetWidths.push(width);
		renderWidths();
		widthInput.value = '';
	}
});


widthInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') addWidthBtn.click();
});


autoFromImageBtn.addEventListener('click', () => {
	if (!originalImage) return;
	setTargetWidths(generateWidthsFromOriginal(originalImage.width));
});


autoFromRenderedBtn.addEventListener('click', () => {
	if (!originalImage) return;
	const rendered = parseInt(displayWidthInput.value, 10);
	const next = generateWidthsFromRendered(rendered, originalImage.width);
	if (next.length) setTargetWidths(next);
});

resetWidthsBtn.addEventListener('click', () => {
	if (lastAutoWidths.length) {
		targetWidths = [...lastAutoWidths];
		renderWidths();
	} else if (originalImage) {
		setTargetWidths(generateWidthsFromOriginal(originalImage.width));
	}
});


renderWidths();

// ------------------------------
// Upload interactions
// ------------------------------


uploadArea.addEventListener('click', () => fileInput.click());


fileInput.addEventListener('change', (e) => {
	const file = e.target.files[0];
	if (file && file.type.startsWith('image/')) handleFile(file);
});


uploadArea.addEventListener('dragover', (e) => {
	e.preventDefault();
	uploadArea.classList.add('drag-over');
});


uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));


uploadArea.addEventListener('drop', (e) => {
	e.preventDefault();
	uploadArea.classList.remove('drag-over');
	const file = e.dataTransfer.files[0];
	if (file && file.type.startsWith('image/')) handleFile(file);
});

function handleFile(file) {
	uploadedFile = file;
	generatedImages = [];
	htmlMarkup = '';


	const reader = new FileReader();
	reader.onload = (e) => {
		previewImage.src = e.target.result;
		previewSection.classList.add('active');
		rightPanel.classList.remove('active');


		const img = new Image();
		img.onload = () => {
			originalImage = img;


			filenameCell.textContent = file.name;
			dimensionCell.textContent = `${img.width} × ${img.height}px`;
			sizeCell.textContent = `${formatKB(file.size)} KB`;


			const fileType = file.type.split('/')[1]?.toUpperCase() || getExt(file.name).toUpperCase() || 'IMAGE';
			fileTypeCell.textContent = fileType;


			// (1) Auto-generate ideal target widths based on the original image width
			setTargetWidths(generateWidthsFromOriginal(img.width));
		};
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
}

clearBtn.addEventListener('click', (e) => {
	e.stopPropagation();
	uploadedFile = null;
	originalImage = null;
	generatedImages = [];
	htmlMarkup = '';
	targetWidths = [];
	lastAutoWidths = [];


	fileInput.value = '';
	altTextInput.value = '';
	if (displayWidthInput) displayWidthInput.value = '';


	previewSection.classList.remove('active');
	rightPanel.classList.remove('active');
	previewImage.src = '';
	renderWidths();
});

// ------------------------------
// Generate
// ------------------------------


generateBtn.addEventListener('click', async () => {
	if (!originalImage || !uploadedFile) return;


	generateBtn.disabled = true;
	rightPanel.classList.add('active');
	progressSection.classList.add('active');
	resultsSection.classList.remove('active');
	generatedImages = [];


	const baseName = getBaseName(uploadedFile.name);
	const originalFilename = uploadedFile.name;


	// Build width list for generated variants
	// - Never generate larger than the original width
	// - De-dupe
	let sortedWidths = uniqueSortedNumbers(targetWidths).filter(w => w <= originalImage.width);


	// If empty (user removed everything), generate something minimal
	if (sortedWidths.length === 0) {
		const fallback = Math.min(400, originalImage.width);
		sortedWidths = [fallback];
	}

	for (let i = 0; i < sortedWidths.length; i++) {
		const width = sortedWidths[i];
		const progress = ((i + 1) / sortedWidths.length) * 100;
		progressText.textContent = `Processing ${width}px (${i + 1}/${sortedWidths.length})...`;
		progressFill.style.width = `${progress}%`;


		try {
			const blob = await resizeImage(originalImage, width, QUALITY);
			const filename = `${baseName}-${width}.webp`;


			generatedImages.push({
				filename,
				width,
				height: Math.round(width * (originalImage.height / originalImage.width)),
				blob,
				size: blob.size,
				isOriginal: false,
			});


			await new Promise(resolve => setTimeout(resolve, 60));
		} catch (error) {
			console.error(`Error processing ${width}px:`, error);
		}
	}

	// Always include the original file as max candidate using its real filename
	generatedImages.push({
		filename: originalFilename,
		width: originalImage.width,
		height: originalImage.height,
		blob: uploadedFile,
		size: uploadedFile.size,
		isOriginal: true,
	});


	// Sort and de-dupe by width. Prefer original when widths match.
	generatedImages.sort((a, b) => a.width - b.width);
	const deduped = [];
	for (const item of generatedImages) {
		const prev = deduped[deduped.length - 1];
		if (prev && prev.width === item.width) {
			deduped[deduped.length - 1] = (item.isOriginal ? item : prev);
		} else {
			deduped.push(item);
		}
	}
	generatedImages = deduped;

	// Alt
	const altText = buildAltText(baseName);


	// srcset
	const srcsetParts = generatedImages
		.map(img => `/images/${img.filename} ${img.width}w`)
		.join(',\n ');


	// sizes
	const candidateWidthsForFallback = generatedImages.map(i => i.width);
	const renderedWidth = pickRenderedWidth(candidateWidthsForFallback);
	const sizesAttr = `(max-width: 768px) 50vw, ${renderedWidth}px`;


	// Pick src fallback: first >= renderedWidth, else largest (original)
	const bestSrcObj = generatedImages.find(img => img.width >= renderedWidth) || generatedImages[generatedImages.length - 1];


	htmlMarkup = `<img\n` +
		` src="/images/${bestSrcObj.filename}"\n` +
		` srcset="${srcsetParts}"\n` +
		` sizes="${sizesAttr}"\n` +
		` width="${bestSrcObj.width}"\n` +
		` height="${bestSrcObj.height}"\n` +
		` alt="${altText}"\n` +
		` loading="lazy"\n` +
		`/>`;


	// Results UI
	progressSection.classList.remove('active');
	resultsSection.classList.add('active');


	const totalSize = generatedImages.reduce((sum, img) => sum + (img.size || 0), 0);
	resultsInfo.innerHTML = `<strong>${generatedImages.length}</strong> images generated · Total size: <strong>${formatKB(totalSize)} KB</strong>`;
	htmlCode.textContent = htmlMarkup;


	generateBtn.disabled = false;
});

// ------------------------------
// Download ZIP
// ------------------------------


downloadBtn.addEventListener('click', async () => {
	if (generatedImages.length === 0) return;


	if (typeof JSZip === 'undefined') {
		alert('JSZip library failed to load. Please refresh the page and try again.');
		return;
	}


	downloadBtn.disabled = true;
	downloadBtn.textContent = '📦 Creating ZIP...';


	try {
		const zip = new JSZip();


		generatedImages.forEach(img => {
			zip.file(img.filename, img.blob);
		});


		const zipBlob = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(zipBlob);


		const a = document.createElement('a');
		a.href = url;
		a.download = `${getBaseName(uploadedFile.name)}-responsive.zip`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Error creating ZIP:', error);
		alert('Failed to create ZIP file. Please try again.');
	}


	downloadBtn.disabled = false;
	downloadBtn.textContent = '📦 Download ZIP';
});

// ------------------------------
// Copy HTML
// ------------------------------


copyBtn.addEventListener('click', async () => {
	try {
		await navigator.clipboard.writeText(htmlMarkup);
		copyBtn.textContent = '✅ Copied!';
		copyBtn.classList.add('copied');


		setTimeout(() => {
			copyBtn.textContent = '📋 Copy HTML';
			copyBtn.classList.remove('copied');
		}, 2000);
	} catch (error) {
		console.error('Failed to copy:', error);
		alert('Failed to copy to clipboard');
	}
});

// ------------------------------
// Canvas resize to WebP
// ------------------------------


function resizeImage(img, targetWidth, quality) {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');


		const aspectRatio = img.height / img.width;
		const targetHeight = Math.round(targetWidth * aspectRatio);


		canvas.width = targetWidth;
		canvas.height = targetHeight;


		ctx.drawImage(img, 0, 0, targetWidth, targetHeight);


		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error('Failed to create blob'));
			},
			'image/webp',
			quality
		);
	});
}
