self.app = {};

document.addEventListener('DOMContentLoaded', startApplication);

function startApplication() {
    // setting up renderer and layout.
    var layout = new app.SunLayout();
    var renderer = new app.CanvasRenderer(document.body.clientWidth, document.body.clientHeight);
    var renderLoop = new app.RenderLoop(renderer, layout);

    // setting defaults
    layout.setPersonRadius(20);
    layout.setSize(3000);
    renderer.setScale(0.49);
    renderer.setRotation(g.degToRad(16));

    document.body.appendChild(renderer.canvasElement());
    new app.DragController(renderer, renderLoop);

    // setting up layout controls
    var layoutControls = document.querySelector('.layout-controls');
    var layoutSliders = [
        new app.Slider('size', size => layout.setSize(size))
            .setValues(100, 5000, layout.size())
            .setSuffix('px'),
        new app.Slider('radius', radius => layout.setPersonRadius(radius))
            .setValues(5, 50, layout.personRadius())
            .setSuffix('px'),
        new app.Slider('overlap', overlap => layout.setOverlap(g.degToRad(overlap)))
            .setValues(0, 360, g.radToDeg(layout.overlap()))
            .setSuffix('deg'),
    ];
    layoutSliders.forEach(slider => layoutControls.appendChild(slider.element()));

    // setting up layout controls
    var rendererControls = document.querySelector('.renderer-controls');
    var rendererSliders = [
        new app.Slider('rotation', rotation => {renderer.setRotation(g.degToRad(rotation)); renderLoop.invalidate(); })
            .setValues(0, 360, g.radToDeg(renderer.rotation()))
            .setSuffix('deg'),
        new app.Slider('font size', fontSize => {renderer.setFontSize(fontSize); renderLoop.invalidate(); })
            .setValues(7, 24, renderer.fontSize())
            .setSuffix('px'),
    ];
    rendererSliders.forEach(slider => rendererControls.appendChild(slider.element()));

    // Load tree
    app.TreeLoader.loadCSV('assets/kalashyan_en.csv').then(onTreeLoaded);

    window.addEventListener('resize', onResize);

    function onTreeLoaded(tree) {
        console.log(tree);
        layout.setFamilyTree(tree);
    }

    function onResize() {
        renderer.setSize(document.body.clientWidth, document.body.clientHeight);
        renderLoop.invalidate();
    }
}

app.DragController = class {
    constructor(renderer, renderLoop) {
        this._renderer = renderer;
        this._renderLoop = renderLoop;
        this._canvas = renderer.canvasElement();
        this._canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
        this._canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
        this._canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        this._canvas.addEventListener('mouseout', this._onMouseUp.bind(this));
        // IE9, Chrome, Safari, Opera
        this._canvas.addEventListener("mousewheel", this._onMouseWheel.bind(this), false);
        // Firefox
        this._canvas.addEventListener("DOMMouseScroll", this._onMouseWheel.bind(this), false);
    }

    /**
     * @param {!Event} event
     * @return {!g.Vec}
     */
    _toCoordinates(event) {
        var rect = this._canvas.getBoundingClientRect();
        var center = new g.Vec(rect.left + rect.width / 2, rect.top + rect.height / 2);
        var point = new g.Vec(event.clientX, event.clientY);
        return point.subtract(center);
    }

    _onMouseWheel(event) {
        var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
        var fixedPoint = this._toCoordinates(event);
        var zoomStep = 0.06;
        var newZoom = this._renderer.scale() + zoomStep * delta;
        newZoom = Math.max(newZoom, 0.25);
        newZoom = Math.min(newZoom, 2);
        this._renderer.setScale(newZoom, fixedPoint);
        this._renderLoop.invalidate();
        event.preventDefault();
        event.stopPropagation();
    }

    _onMouseDown(event) {
        this._downCoord = this._toCoordinates(event);
        this._offset = this._renderer.offset();
        event.preventDefault(true);
        event.stopPropagation();
    }

    _onMouseMove(event) {
        if (!this._downCoord)
            return;
        var offset = this._toCoordinates(event).subtract(this._downCoord);
        this._renderer.setOffset(this._offset.add(offset));
        this._renderLoop.invalidate();
    }

    _onMouseUp(event) {
        this._downCoord = null;
        this._offset = null;
    }
}

app.Slider = class {
    /**
     * @param {string} name
     * @param {function(number)} valueChangedCallback
     */
    constructor(name, valueChangedCallback) {
        this._element = document.createElement('div');
        this._element.classList.add('slider');

        var label = this._element.createChild('div');
        label.textContent = name;

        this._slider = this._element.createChild('input');
        this._slider.type = 'range';
        this._slider.min = 1;
        this._slider.max = 10;
        this._slider.value = 5;

        this._valueElement = this._element.createChild('div');
        this._valueElement.classList.add('value');
        this.setSuffix('');

        this._slider.addEventListener('input', () => {
            this._updateValue();
            valueChangedCallback(parseFloat(this._slider.value));
        });
    }

    /**
     * @return {!Element}
     */
    element() {
        return this._element;
    }

    /**
     * @param {string} className
     */
    setClass(className) {
        this._element.classList.add(className);
        return this;
    }

    /**
     * @param {number} min
     * @param {number} max
     * @param {number} value
     * @param {number} step
     * @return {!app.Slider}
     */
    setValues(min, max, value, step) {
        console.assert(min <= value && value <= max);
        this._slider.step = step || 1;;
        this._slider.min = min;
        this._slider.max = max;
        this._slider.value = value;
        this._updateValue();
        return this;
    }

    _updateValue() {
        this._valueElement.textContent = this._slider.value + this._suffix;
    }

    /**
     * @param {string} suffix
     * @return {!app.Slider}
     */
    setSuffix(suffix) {
        this._suffix = suffix;
        this._updateValue();
        return this;
    }
}

