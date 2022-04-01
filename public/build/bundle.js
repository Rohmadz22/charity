
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35731/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Modal.svelte generated by Svelte v3.46.4 */

    function create_fragment$7(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Modal', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\components\CharityList.svelte generated by Svelte v3.46.4 */
    const file$4 = "src\\components\\CharityList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (55:8) {#if charities !== undefined}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*charities*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*handleButton, charities, calculateDaysRemaining, calculateFunded, formatCurrency, handleCloseModal, isModalOpen*/ 15) {
    				each_value = /*charities*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(55:8) {#if charities !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (59:16) {#if isModalOpen === true}
    function create_if_block_1(ctx) {
    	let modal;
    	let current;

    	modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, charities*/ 129) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(59:16) {#if isModalOpen === true}",
    		ctx
    	});

    	return block;
    }

    // (60:16) <Modal>
    function create_default_slot(ctx) {
    	let div9;
    	let div8;
    	let div7;
    	let div0;
    	let h5;
    	let t0_value = /*charity*/ ctx[4].title + "";
    	let t0;
    	let t1;
    	let button0;
    	let span;
    	let t3;
    	let div5;
    	let form;
    	let div1;
    	let label0;
    	let t5;
    	let input0;
    	let t6;
    	let div2;
    	let label1;
    	let t8;
    	let input1;
    	let t9;
    	let div3;
    	let label2;
    	let t11;
    	let input2;
    	let t12;
    	let div4;
    	let input3;
    	let t13;
    	let label3;
    	let t15;
    	let div6;
    	let button1;
    	let t17;
    	let div10;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			t0 = text(t0_value);
    			t1 = space();
    			button0 = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t3 = space();
    			div5 = element("div");
    			form = element("form");
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Amount donation";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Your name";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Email address";
    			t11 = space();
    			input2 = element("input");
    			t12 = space();
    			div4 = element("div");
    			input3 = element("input");
    			t13 = space();
    			label3 = element("label");
    			label3.textContent = "I Agree";
    			t15 = space();
    			div6 = element("div");
    			button1 = element("button");
    			button1.textContent = "Continue";
    			t17 = space();
    			div10 = element("div");
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "exampleModalLabel");
    			add_location(h5, file$4, 68, 28, 2145);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$4, 76, 32, 2559);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$4, 69, 28, 2242);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$4, 67, 24, 2089);
    			attr_dev(label0, "for", "exampleInputAmount");
    			add_location(label0, file$4, 82, 36, 2851);
    			input0.required = true;
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "exampleInputAmount");
    			attr_dev(input0, "aria-describedby", "amountHelp");
    			attr_dev(input0, "placeholder", "Enter amount");
    			add_location(input0, file$4, 83, 36, 2944);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$4, 81, 32, 2789);
    			attr_dev(label1, "for", "exampleInputName");
    			add_location(label1, file$4, 87, 36, 3253);
    			input1.required = true;
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "exampleInputName");
    			attr_dev(input1, "aria-describedby", "nameHelp");
    			attr_dev(input1, "placeholder", "Enter full name");
    			add_location(input1, file$4, 88, 36, 3338);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$4, 86, 32, 3191);
    			attr_dev(label2, "for", "exampleInputEmail1");
    			add_location(label2, file$4, 92, 36, 3644);
    			input2.required = true;
    			attr_dev(input2, "type", "email");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "id", "exampleInputEmail1");
    			attr_dev(input2, "aria-describedby", "emailHelp");
    			attr_dev(input2, "placeholder", "Enter email");
    			add_location(input2, file$4, 93, 36, 3735);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$4, 91, 32, 3582);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "form-check-input");
    			attr_dev(input3, "id", "exampleCheck1");
    			add_location(input3, file$4, 97, 36, 4041);
    			attr_dev(label3, "class", "form-check-label");
    			attr_dev(label3, "for", "exampleCheck1");
    			add_location(label3, file$4, 98, 36, 4146);
    			attr_dev(div4, "class", "form-check");
    			add_location(div4, file$4, 96, 32, 3979);
    			add_location(form, file$4, 80, 28, 2749);
    			attr_dev(div5, "class", "modal-body");
    			add_location(div5, file$4, 79, 24, 2695);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-primary");
    			add_location(button1, file$4, 103, 28, 4404);
    			attr_dev(div6, "class", "modal-footer");
    			add_location(div6, file$4, 102, 24, 4348);
    			attr_dev(div7, "class", "modal-content");
    			add_location(div7, file$4, 66, 20, 2036);
    			attr_dev(div8, "class", "modal-dialog");
    			attr_dev(div8, "role", "document");
    			add_location(div8, file$4, 65, 16, 1972);
    			attr_dev(div9, "class", "modal fade show svelte-phmkyf");
    			attr_dev(div9, "id", "exampleModal");
    			attr_dev(div9, "tabindex", "-1");
    			attr_dev(div9, "role", "dialog");
    			attr_dev(div9, "aria-labelledby", "exampleModalLabel");
    			add_location(div9, file$4, 63, 16, 1826);
    			attr_dev(div10, "class", "xs-popular-item xs-box-shadow");
    			add_location(div10, file$4, 108, 12, 4585);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t0);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span);
    			append_dev(div7, t3);
    			append_dev(div7, div5);
    			append_dev(div5, form);
    			append_dev(form, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t5);
    			append_dev(div1, input0);
    			append_dev(form, t6);
    			append_dev(form, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t8);
    			append_dev(div2, input1);
    			append_dev(form, t9);
    			append_dev(form, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t11);
    			append_dev(div3, input2);
    			append_dev(form, t12);
    			append_dev(form, div4);
    			append_dev(div4, input3);
    			append_dev(div4, t13);
    			append_dev(div4, label3);
    			append_dev(div7, t15);
    			append_dev(div7, div6);
    			append_dev(div6, button1);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div10, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button0, "click", /*handleCloseModal*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*charities*/ 1 && t0_value !== (t0_value = /*charity*/ ctx[4].title + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(div10);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(60:16) <Modal>",
    		ctx
    	});

    	return block;
    }

    // (56:8) {#each charities as charity}
    function create_each_block(ctx) {
    	let div9;
    	let div8;
    	let t0;
    	let div7;
    	let div2;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let div1;
    	let div0;
    	let p;
    	let span0;
    	let t2_value = calculateFunded(/*charity*/ ctx[4].pledged, /*charity*/ ctx[4].target) + "";
    	let t2;
    	let t3;
    	let t4;
    	let div6;
    	let ul0;
    	let li0;
    	let a0;
    	let t5_value = /*charity*/ ctx[4].category + "";
    	let t5;
    	let t6;
    	let a1;
    	let t7_value = /*charity*/ ctx[4].title + "";
    	let t7;
    	let t8;
    	let ul1;
    	let li1;
    	let t9_value = formatCurrency(/*charity*/ ctx[4].pledged) + "";
    	let t9;
    	let span1;
    	let t11;
    	let li2;
    	let span2;
    	let t12_value = calculateFunded(/*charity*/ ctx[4].pledged, /*charity*/ ctx[4].target) + "";
    	let t12;
    	let t13;
    	let span3;
    	let t15;
    	let li3;
    	let t16_value = calculateDaysRemaining(/*charity*/ ctx[4].date_end) + "";
    	let t16;
    	let span4;
    	let t18;
    	let span5;
    	let t19;
    	let div5;
    	let div3;
    	let img1;
    	let img1_src_value;
    	let t20;
    	let div4;
    	let a2;
    	let span6;
    	let t22_value = /*charity*/ ctx[4].profile_name + "";
    	let t22;
    	let t23;
    	let span7;
    	let t24;
    	let button;
    	let t26;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*isModalOpen*/ ctx[1] === true && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div7 = element("div");
    			div2 = element("div");
    			img0 = element("img");
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			span0 = element("span");
    			t2 = text(t2_value);
    			t3 = text("\r\n                                    %");
    			t4 = space();
    			div6 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			t5 = text(t5_value);
    			t6 = space();
    			a1 = element("a");
    			t7 = text(t7_value);
    			t8 = space();
    			ul1 = element("ul");
    			li1 = element("li");
    			t9 = text(t9_value);
    			span1 = element("span");
    			span1.textContent = "Pledged";
    			t11 = space();
    			li2 = element("li");
    			span2 = element("span");
    			t12 = text(t12_value);
    			t13 = text("\r\n                            %\r\n                            ");
    			span3 = element("span");
    			span3.textContent = "Funded";
    			t15 = space();
    			li3 = element("li");
    			t16 = text(t16_value);
    			span4 = element("span");
    			span4.textContent = "Days to go";
    			t18 = space();
    			span5 = element("span");
    			t19 = space();
    			div5 = element("div");
    			div3 = element("div");
    			img1 = element("img");
    			t20 = space();
    			div4 = element("div");
    			a2 = element("a");
    			span6 = element("span");
    			span6.textContent = "By";
    			t22 = text(t22_value);
    			t23 = space();
    			span7 = element("span");
    			t24 = space();
    			button = element("button");
    			button.textContent = "Donate This Cause";
    			t26 = space();
    			if (!src_url_equal(img0.src, img0_src_value = "assets/images/causes/causes_4.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$4, 116, 24, 4816);
    			attr_dev(span0, "class", "number-percentage-count number-percentage");
    			attr_dev(span0, "data-value", "90");
    			attr_dev(span0, "data-animation-duration", "3500");
    			add_location(span0, file$4, 123, 35, 5067);
    			add_location(p, file$4, 123, 32, 5064);
    			attr_dev(div0, "class", "xs-skill-track");
    			add_location(div0, file$4, 120, 28, 4974);
    			attr_dev(div1, "class", "xs-skill-bar");
    			add_location(div1, file$4, 119, 24, 4918);
    			attr_dev(div2, "class", "xs-item-header");
    			add_location(div2, file$4, 114, 20, 4760);
    			attr_dev(a0, "href", "");
    			add_location(a0, file$4, 135, 32, 5765);
    			add_location(li0, file$4, 135, 28, 5761);
    			attr_dev(ul0, "class", "xs-simple-tag xs-mb-20");
    			add_location(ul0, file$4, 133, 24, 5621);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "xs-post-title xs-mb-30");
    			add_location(a1, file$4, 139, 24, 5933);
    			add_location(span1, file$4, 144, 65, 6179);
    			add_location(li1, file$4, 144, 28, 6142);
    			attr_dev(span2, "class", "number-percentage-count number-percentage");
    			attr_dev(span2, "data-value", "90");
    			attr_dev(span2, "data-animation-duration", "3500");
    			add_location(span2, file$4, 145, 32, 6238);
    			add_location(span3, file$4, 151, 28, 6593);
    			add_location(li2, file$4, 145, 28, 6234);
    			add_location(span4, file$4, 154, 74, 6761);
    			add_location(li3, file$4, 154, 28, 6715);
    			attr_dev(ul1, "class", "xs-list-with-content svelte-phmkyf");
    			add_location(ul1, file$4, 143, 24, 6079);
    			attr_dev(span5, "class", "xs-separetor");
    			add_location(span5, file$4, 157, 24, 6848);
    			if (!src_url_equal(img1.src, img1_src_value = "assets/images/avatar/avatar_1.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$4, 161, 32, 7032);
    			attr_dev(div3, "class", "xs-round-avatar");
    			add_location(div3, file$4, 160, 28, 6969);
    			add_location(span6, file$4, 165, 44, 7304);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$4, 165, 32, 7292);
    			attr_dev(div4, "class", "xs-avatar-title");
    			add_location(div4, file$4, 163, 28, 7150);
    			attr_dev(div5, "class", "row xs-margin-0");
    			add_location(div5, file$4, 159, 24, 6910);
    			attr_dev(span7, "class", "xs-separetor");
    			add_location(span7, file$4, 169, 24, 7441);
    			attr_dev(button, "data-toggle", "modal");
    			attr_dev(button, "data-target", "#exampleModal");
    			attr_dev(button, "class", "btn btn-primary btn-block");
    			add_location(button, file$4, 172, 24, 7574);
    			attr_dev(div6, "class", "xs-item-content");
    			add_location(div6, file$4, 132, 20, 5566);
    			attr_dev(div7, "class", "xs-popular-item xs-box-shadow");
    			add_location(div7, file$4, 113, 16, 4695);
    			attr_dev(div8, "class", "col-lg-4 col-md-6");
    			add_location(div8, file$4, 57, 12, 1609);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$4, 56, 8, 1578);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			if (if_block) if_block.m(div8, null);
    			append_dev(div8, t0);
    			append_dev(div8, div7);
    			append_dev(div7, div2);
    			append_dev(div2, img0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, span0);
    			append_dev(span0, t2);
    			append_dev(p, t3);
    			append_dev(div7, t4);
    			append_dev(div7, div6);
    			append_dev(div6, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(a0, t5);
    			append_dev(div6, t6);
    			append_dev(div6, a1);
    			append_dev(a1, t7);
    			append_dev(div6, t8);
    			append_dev(div6, ul1);
    			append_dev(ul1, li1);
    			append_dev(li1, t9);
    			append_dev(li1, span1);
    			append_dev(ul1, t11);
    			append_dev(ul1, li2);
    			append_dev(li2, span2);
    			append_dev(span2, t12);
    			append_dev(li2, t13);
    			append_dev(li2, span3);
    			append_dev(ul1, t15);
    			append_dev(ul1, li3);
    			append_dev(li3, t16);
    			append_dev(li3, span4);
    			append_dev(div6, t18);
    			append_dev(div6, span5);
    			append_dev(div6, t19);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, img1);
    			append_dev(div5, t20);
    			append_dev(div5, div4);
    			append_dev(div4, a2);
    			append_dev(a2, span6);
    			append_dev(a2, t22);
    			append_dev(div6, t23);
    			append_dev(div6, span7);
    			append_dev(div6, t24);
    			append_dev(div6, button);
    			append_dev(div9, t26);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleButton*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*isModalOpen*/ ctx[1] === true) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isModalOpen*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div8, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*charities*/ 1) && t2_value !== (t2_value = calculateFunded(/*charity*/ ctx[4].pledged, /*charity*/ ctx[4].target) + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*charities*/ 1) && t5_value !== (t5_value = /*charity*/ ctx[4].category + "")) set_data_dev(t5, t5_value);
    			if ((!current || dirty & /*charities*/ 1) && t7_value !== (t7_value = /*charity*/ ctx[4].title + "")) set_data_dev(t7, t7_value);
    			if ((!current || dirty & /*charities*/ 1) && t9_value !== (t9_value = formatCurrency(/*charity*/ ctx[4].pledged) + "")) set_data_dev(t9, t9_value);
    			if ((!current || dirty & /*charities*/ 1) && t12_value !== (t12_value = calculateFunded(/*charity*/ ctx[4].pledged, /*charity*/ ctx[4].target) + "")) set_data_dev(t12, t12_value);
    			if ((!current || dirty & /*charities*/ 1) && t16_value !== (t16_value = calculateDaysRemaining(/*charity*/ ctx[4].date_end) + "")) set_data_dev(t16, t16_value);
    			if ((!current || dirty & /*charities*/ 1) && t22_value !== (t22_value = /*charity*/ ctx[4].profile_name + "")) set_data_dev(t22, t22_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(56:8) {#each charities as charity}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let section;
    	let div2;
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let span;
    	let t2;
    	let p;
    	let t3;
    	let br;
    	let t4;
    	let t5;
    	let current;
    	let if_block = /*charities*/ ctx[0] !== undefined && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Popular Causes";
    			t1 = space();
    			span = element("span");
    			t2 = space();
    			p = element("p");
    			t3 = text("FundPress has built a platform focused on aiding entrepreneurs, startups, and ");
    			br = element("br");
    			t4 = text(" companies\r\n                    raise capital from anyone.");
    			t5 = space();
    			if (if_block) if_block.c();
    			attr_dev(h2, "class", "xs-title");
    			add_location(h2, file$4, 48, 16, 1144);
    			attr_dev(span, "class", "xs-separetor dashed");
    			add_location(span, file$4, 49, 16, 1202);
    			add_location(br, file$4, 50, 97, 1342);
    			add_location(p, file$4, 50, 16, 1261);
    			attr_dev(div0, "class", "col-md-9 col-xl-9");
    			add_location(div0, file$4, 47, 12, 1095);
    			attr_dev(div1, "class", "xs-heading row xs-mb-60");
    			add_location(div1, file$4, 46, 8, 1044);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$4, 45, 4, 1011);
    			attr_dev(section, "id", "popularcause");
    			attr_dev(section, "class", "bg-gray waypoint-tigger xs-section-padding");
    			add_location(section, file$4, 44, 0, 927);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(p, t3);
    			append_dev(p, br);
    			append_dev(p, t4);
    			append_dev(div2, t5);
    			if (if_block) if_block.m(div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*charities*/ ctx[0] !== undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*charities*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div2, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function calculateFunded(pledged, target) {
    	return Math.round(1 / (target / pledged) * 100);
    }

    function formatCurrency(nominal) {
    	return nominal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
    }

    function calculateDaysRemaining(date_end) {
    	const delta = date_end - new Date();
    	const oneDay = 24 * 60 * 60 * 1000;
    	return Math.round(Math.abs(delta / oneDay));
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CharityList', slots, []);
    	let { charities } = $$props;
    	let isModalOpen = false;

    	function handleButton() {
    		$$invalidate(1, isModalOpen = true);
    	}

    	function handleCloseModal() {
    		$$invalidate(1, isModalOpen = false);
    	}

    	const writable_props = ['charities'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CharityList> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('charities' in $$props) $$invalidate(0, charities = $$props.charities);
    	};

    	$$self.$capture_state = () => ({
    		Modal,
    		charities,
    		isModalOpen,
    		calculateFunded,
    		formatCurrency,
    		calculateDaysRemaining,
    		handleButton,
    		handleCloseModal
    	});

    	$$self.$inject_state = $$props => {
    		if ('charities' in $$props) $$invalidate(0, charities = $$props.charities);
    		if ('isModalOpen' in $$props) $$invalidate(1, isModalOpen = $$props.isModalOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [charities, isModalOpen, handleButton, handleCloseModal];
    }

    class CharityList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { charities: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CharityList",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*charities*/ ctx[0] === undefined && !('charities' in props)) {
    			console.warn("<CharityList> was created without expected prop 'charities'");
    		}
    	}

    	get charities() {
    		throw new Error("<CharityList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set charities(value) {
    		throw new Error("<CharityList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Header.svelte generated by Svelte v3.46.4 */

    const file$3 = "src\\components\\Header.svelte";

    function create_fragment$5(ctx) {
    	let header;
    	let div6;
    	let nav;
    	let div1;
    	let div0;
    	let t0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let div5;
    	let div2;
    	let a1;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let div3;
    	let ul;
    	let li0;
    	let a2;
    	let t4;
    	let li1;
    	let a3;
    	let t6;
    	let li2;
    	let a4;
    	let t8;
    	let div4;
    	let a5;
    	let span;
    	let i;
    	let t9;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div6 = element("div");
    			nav = element("nav");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			a0 = element("a");
    			img0 = element("img");
    			t1 = space();
    			div5 = element("div");
    			div2 = element("div");
    			a1 = element("a");
    			img1 = element("img");
    			t2 = space();
    			div3 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a2 = element("a");
    			a2.textContent = "home";
    			t4 = space();
    			li1 = element("li");
    			a3 = element("a");
    			a3.textContent = "about";
    			t6 = space();
    			li2 = element("li");
    			a4 = element("a");
    			a4.textContent = "Contact";
    			t8 = space();
    			div4 = element("div");
    			a5 = element("a");
    			span = element("span");
    			i = element("i");
    			t9 = text(" Donate Now");
    			attr_dev(div0, "class", "nav-toggle");
    			add_location(div0, file$3, 5, 16, 187);
    			if (!src_url_equal(img0.src, img0_src_value = "assets/images/logo.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$3, 7, 20, 295);
    			attr_dev(a0, "href", "index.html");
    			attr_dev(a0, "class", "nav-logo");
    			add_location(a0, file$3, 6, 16, 235);
    			attr_dev(div1, "class", "nav-header");
    			add_location(div1, file$3, 4, 12, 145);
    			if (!src_url_equal(img1.src, img1_src_value = "assets/images/logo.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$3, 14, 24, 628);
    			attr_dev(a1, "class", "nav-brand");
    			attr_dev(a1, "href", "index.html");
    			add_location(a1, file$3, 13, 20, 563);
    			attr_dev(div2, "class", "xs-logo-wraper col-lg-2 xs-padding-0");
    			add_location(div2, file$3, 12, 16, 491);
    			attr_dev(a2, "href", "index.html");
    			add_location(a2, file$3, 19, 28, 860);
    			add_location(li0, file$3, 19, 24, 856);
    			attr_dev(a3, "href", "about.html");
    			add_location(a3, file$3, 20, 28, 924);
    			add_location(li1, file$3, 20, 24, 920);
    			attr_dev(a4, "href", "contact.html");
    			add_location(a4, file$3, 21, 28, 989);
    			add_location(li2, file$3, 21, 24, 985);
    			attr_dev(ul, "class", "nav-menu");
    			add_location(ul, file$3, 18, 20, 809);
    			attr_dev(div3, "class", "col-lg-7");
    			add_location(div3, file$3, 17, 16, 765);
    			attr_dev(i, "class", "fa fa-heart");
    			add_location(i, file$3, 26, 44, 1290);
    			attr_dev(span, "class", "badge");
    			add_location(span, file$3, 26, 24, 1270);
    			attr_dev(a5, "href", "#popularcause");
    			attr_dev(a5, "class", "btn btn-primary");
    			add_location(a5, file$3, 25, 20, 1196);
    			attr_dev(div4, "class", "xs-navs-button d-flex-center-end col-lg-3");
    			add_location(div4, file$3, 24, 16, 1119);
    			attr_dev(div5, "class", "nav-menus-wrapper row");
    			add_location(div5, file$3, 11, 12, 438);
    			attr_dev(nav, "class", "xs-menus");
    			add_location(nav, file$3, 3, 8, 109);
    			attr_dev(div6, "class", "container");
    			add_location(div6, file$3, 2, 4, 76);
    			attr_dev(header, "class", "xs-header header-transparent");
    			add_location(header, file$3, 1, 0, 25);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div6);
    			append_dev(div6, nav);
    			append_dev(nav, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, a0);
    			append_dev(a0, img0);
    			append_dev(nav, t1);
    			append_dev(nav, div5);
    			append_dev(div5, div2);
    			append_dev(div2, a1);
    			append_dev(a1, img1);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div3, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a2);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, a3);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, a4);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, a5);
    			append_dev(a5, span);
    			append_dev(span, i);
    			append_dev(a5, t9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\Welcome.svelte generated by Svelte v3.46.4 */

    const file$2 = "src\\components\\Welcome.svelte";

    function create_fragment$4(ctx) {
    	let section;
    	let div12;
    	let div3;
    	let div1;
    	let div0;
    	let h20;
    	let t1;
    	let p0;
    	let t2;
    	let br0;
    	let t3;
    	let t4;
    	let a0;
    	let t6;
    	let div2;
    	let t7;
    	let div7;
    	let div5;
    	let div4;
    	let h21;
    	let t9;
    	let p1;
    	let t10;
    	let br1;
    	let t11;
    	let t12;
    	let a1;
    	let t14;
    	let div6;
    	let t15;
    	let div11;
    	let div9;
    	let div8;
    	let h22;
    	let t17;
    	let p2;
    	let t18;
    	let br2;
    	let t19;
    	let t20;
    	let a2;
    	let t22;
    	let div10;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div12 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Hunger is stalking the globe";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("Hundreds of thousands of children experiencing or witnessing assault ");
    			br0 = element("br");
    			t3 = text(" and other\r\n                        gender-based violence.");
    			t4 = space();
    			a0 = element("a");
    			a0.textContent = "View Causes";
    			t6 = space();
    			div2 = element("div");
    			t7 = space();
    			div7 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Let's free the nature at all";
    			t9 = space();
    			p1 = element("p");
    			t10 = text("Hundreds of thousands of children experiencing or witnessing assault ");
    			br1 = element("br");
    			t11 = text(" and other\r\n                        gender-based violence.");
    			t12 = space();
    			a1 = element("a");
    			a1.textContent = "View Causes";
    			t14 = space();
    			div6 = element("div");
    			t15 = space();
    			div11 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Help us in big mission to rescue";
    			t17 = space();
    			p2 = element("p");
    			t18 = text("Hundreds of thousands of children experiencing or witnessing assault ");
    			br2 = element("br");
    			t19 = text(" and other\r\n                        gender-based violence.");
    			t20 = space();
    			a2 = element("a");
    			a2.textContent = "View Causes";
    			t22 = space();
    			div10 = element("div");
    			add_location(h20, file$2, 6, 20, 328);
    			add_location(br0, file$2, 7, 92, 459);
    			add_location(p0, file$2, 7, 20, 387);
    			attr_dev(a0, "href", "#popularcause");
    			attr_dev(a0, "class", "btn btn-outline-primary");
    			add_location(a0, file$2, 9, 20, 547);
    			attr_dev(div0, "class", "xs-welcome-wraper color-white");
    			add_location(div0, file$2, 5, 16, 263);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$2, 4, 12, 222);
    			attr_dev(div2, "class", "xs-black-overlay");
    			add_location(div2, file$2, 14, 12, 778);
    			attr_dev(div3, "class", "xs-welcome-content");
    			set_style(div3, "background-image", "url(assets/images/slide1.png)");
    			add_location(div3, file$2, 3, 8, 120);
    			add_location(h21, file$2, 19, 20, 1081);
    			add_location(br1, file$2, 20, 92, 1212);
    			add_location(p1, file$2, 20, 20, 1140);
    			attr_dev(a1, "href", "#popularcause");
    			attr_dev(a1, "class", "btn btn-outline-primary");
    			add_location(a1, file$2, 22, 20, 1300);
    			attr_dev(div4, "class", "xs-welcome-wraper color-white");
    			add_location(div4, file$2, 18, 16, 1016);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$2, 17, 12, 975);
    			attr_dev(div6, "class", "xs-black-overlay");
    			add_location(div6, file$2, 27, 12, 1531);
    			attr_dev(div7, "class", "xs-welcome-content");
    			set_style(div7, "background-image", "url(assets/images/slide2.png)");
    			add_location(div7, file$2, 16, 8, 872);
    			add_location(h22, file$2, 32, 20, 1834);
    			add_location(br2, file$2, 33, 92, 1969);
    			add_location(p2, file$2, 33, 20, 1897);
    			attr_dev(a2, "href", "#popularcause");
    			attr_dev(a2, "class", "btn btn-outline-primary");
    			add_location(a2, file$2, 35, 20, 2057);
    			attr_dev(div8, "class", "xs-welcome-wraper color-white");
    			add_location(div8, file$2, 31, 16, 1769);
    			attr_dev(div9, "class", "container");
    			add_location(div9, file$2, 30, 12, 1728);
    			attr_dev(div10, "class", "xs-black-overlay");
    			add_location(div10, file$2, 40, 12, 2288);
    			attr_dev(div11, "class", "xs-welcome-content");
    			set_style(div11, "background-image", "url(assets/images/slide3.png)");
    			add_location(div11, file$2, 29, 8, 1625);
    			attr_dev(div12, "class", "xs-banner-slider owl-carousel");
    			add_location(div12, file$2, 2, 4, 67);
    			attr_dev(section, "class", "xs-welcome-slider");
    			add_location(section, file$2, 1, 0, 26);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div12);
    			append_dev(div12, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h20);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(p0, t2);
    			append_dev(p0, br0);
    			append_dev(p0, t3);
    			append_dev(div0, t4);
    			append_dev(div0, a0);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div12, t7);
    			append_dev(div12, div7);
    			append_dev(div7, div5);
    			append_dev(div5, div4);
    			append_dev(div4, h21);
    			append_dev(div4, t9);
    			append_dev(div4, p1);
    			append_dev(p1, t10);
    			append_dev(p1, br1);
    			append_dev(p1, t11);
    			append_dev(div4, t12);
    			append_dev(div4, a1);
    			append_dev(div7, t14);
    			append_dev(div7, div6);
    			append_dev(div12, t15);
    			append_dev(div12, div11);
    			append_dev(div11, div9);
    			append_dev(div9, div8);
    			append_dev(div8, h22);
    			append_dev(div8, t17);
    			append_dev(div8, p2);
    			append_dev(p2, t18);
    			append_dev(p2, br2);
    			append_dev(p2, t19);
    			append_dev(div8, t20);
    			append_dev(div8, a2);
    			append_dev(div11, t22);
    			append_dev(div11, div10);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Welcome', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Welcome> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Welcome extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Welcome",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\Promo.svelte generated by Svelte v3.46.4 */

    const file$1 = "src\\components\\Promo.svelte";

    function create_fragment$3(ctx) {
    	let section;
    	let div10;
    	let div0;
    	let h2;
    	let t0;
    	let span0;
    	let t2;
    	let br0;
    	let t3;
    	let t4;
    	let div9;
    	let div2;
    	let div1;
    	let span1;
    	let t5;
    	let h50;
    	let t6;
    	let br1;
    	let t7;
    	let t8;
    	let p0;
    	let t10;
    	let div4;
    	let div3;
    	let span2;
    	let t11;
    	let h51;
    	let t12;
    	let br2;
    	let t13;
    	let t14;
    	let p1;
    	let t16;
    	let div6;
    	let div5;
    	let span3;
    	let t17;
    	let h52;
    	let t18;
    	let br3;
    	let t19;
    	let t20;
    	let p2;
    	let t22;
    	let div8;
    	let div7;
    	let span4;
    	let t23;
    	let h53;
    	let t24;
    	let br4;
    	let t25;
    	let t26;
    	let p3;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div10 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			t0 = text("We’ve funded ");
    			span0 = element("span");
    			span0.textContent = "120,00 charity projects";
    			t2 = text(" for ");
    			br0 = element("br");
    			t3 = text(" 20M people\r\n                around the world.");
    			t4 = space();
    			div9 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			span1 = element("span");
    			t5 = space();
    			h50 = element("h5");
    			t6 = text("Pure Water ");
    			br1 = element("br");
    			t7 = text("For Poor People");
    			t8 = space();
    			p0 = element("p");
    			p0.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health,\r\n                        boost local economies.";
    			t10 = space();
    			div4 = element("div");
    			div3 = element("div");
    			span2 = element("span");
    			t11 = space();
    			h51 = element("h5");
    			t12 = text("Healty Food ");
    			br2 = element("br");
    			t13 = text("For Poor People");
    			t14 = space();
    			p1 = element("p");
    			p1.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health,\r\n                        boost local economies.";
    			t16 = space();
    			div6 = element("div");
    			div5 = element("div");
    			span3 = element("span");
    			t17 = space();
    			h52 = element("h5");
    			t18 = text("Medical ");
    			br3 = element("br");
    			t19 = text("Facilities for People");
    			t20 = space();
    			p2 = element("p");
    			p2.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health,\r\n                        boost local economies.";
    			t22 = space();
    			div8 = element("div");
    			div7 = element("div");
    			span4 = element("span");
    			t23 = space();
    			h53 = element("h5");
    			t24 = text("Pure Education ");
    			br4 = element("br");
    			t25 = text("For Every Children");
    			t26 = space();
    			p3 = element("p");
    			p3.textContent = "663 million people drink dirty water. Learn how access to clean water can improve health,\r\n                        boost local economies.";
    			add_location(span0, file$1, 4, 54, 214);
    			add_location(br0, file$1, 4, 95, 255);
    			attr_dev(h2, "class", "xs-mb-0 xs-title");
    			add_location(h2, file$1, 4, 12, 172);
    			attr_dev(div0, "class", "xs-heading xs-mb-70 text-center");
    			add_location(div0, file$1, 3, 8, 113);
    			attr_dev(span1, "class", "icon-water");
    			add_location(span1, file$1, 10, 20, 468);
    			add_location(br1, file$1, 11, 35, 537);
    			add_location(h50, file$1, 11, 20, 522);
    			add_location(p0, file$1, 12, 20, 583);
    			attr_dev(div1, "class", "xs-service-promo");
    			add_location(div1, file$1, 9, 16, 416);
    			attr_dev(div2, "class", "col-md-6 col-lg-3");
    			add_location(div2, file$1, 8, 12, 367);
    			attr_dev(span2, "class", "icon-groceries");
    			add_location(span2, file$1, 18, 20, 916);
    			add_location(br2, file$1, 19, 36, 990);
    			add_location(h51, file$1, 19, 20, 974);
    			add_location(p1, file$1, 20, 20, 1036);
    			attr_dev(div3, "class", "xs-service-promo");
    			add_location(div3, file$1, 17, 16, 864);
    			attr_dev(div4, "class", "col-md-6 col-lg-3");
    			add_location(div4, file$1, 16, 12, 815);
    			attr_dev(span3, "class", "icon-heartbeat");
    			add_location(span3, file$1, 26, 20, 1369);
    			add_location(br3, file$1, 27, 32, 1439);
    			add_location(h52, file$1, 27, 20, 1427);
    			add_location(p2, file$1, 28, 20, 1491);
    			attr_dev(div5, "class", "xs-service-promo");
    			add_location(div5, file$1, 25, 16, 1317);
    			attr_dev(div6, "class", "col-md-6 col-lg-3");
    			add_location(div6, file$1, 24, 12, 1268);
    			attr_dev(span4, "class", "icon-open-book");
    			add_location(span4, file$1, 34, 20, 1824);
    			add_location(br4, file$1, 35, 39, 1901);
    			add_location(h53, file$1, 35, 20, 1882);
    			add_location(p3, file$1, 36, 20, 1950);
    			attr_dev(div7, "class", "xs-service-promo");
    			add_location(div7, file$1, 33, 16, 1772);
    			attr_dev(div8, "class", "col-md-6 col-lg-3");
    			add_location(div8, file$1, 32, 12, 1723);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$1, 7, 8, 336);
    			attr_dev(div10, "class", "container");
    			add_location(div10, file$1, 2, 4, 80);
    			attr_dev(section, "class", "xs-section-padding");
    			add_location(section, file$1, 1, 0, 38);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div10);
    			append_dev(div10, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t0);
    			append_dev(h2, span0);
    			append_dev(h2, t2);
    			append_dev(h2, br0);
    			append_dev(h2, t3);
    			append_dev(div10, t4);
    			append_dev(div10, div9);
    			append_dev(div9, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span1);
    			append_dev(div1, t5);
    			append_dev(div1, h50);
    			append_dev(h50, t6);
    			append_dev(h50, br1);
    			append_dev(h50, t7);
    			append_dev(div1, t8);
    			append_dev(div1, p0);
    			append_dev(div9, t10);
    			append_dev(div9, div4);
    			append_dev(div4, div3);
    			append_dev(div3, span2);
    			append_dev(div3, t11);
    			append_dev(div3, h51);
    			append_dev(h51, t12);
    			append_dev(h51, br2);
    			append_dev(h51, t13);
    			append_dev(div3, t14);
    			append_dev(div3, p1);
    			append_dev(div9, t16);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div5, span3);
    			append_dev(div5, t17);
    			append_dev(div5, h52);
    			append_dev(h52, t18);
    			append_dev(h52, br3);
    			append_dev(h52, t19);
    			append_dev(div5, t20);
    			append_dev(div5, p2);
    			append_dev(div9, t22);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, span4);
    			append_dev(div7, t23);
    			append_dev(div7, h53);
    			append_dev(h53, t24);
    			append_dev(h53, br4);
    			append_dev(h53, t25);
    			append_dev(div7, t26);
    			append_dev(div7, p3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Promo', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Promo> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Promo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Promo",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\Footer.svelte generated by Svelte v3.46.4 */

    const file = "src\\components\\Footer.svelte";

    function create_fragment$2(ctx) {
    	let footer;
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let p0;
    	let t2;
    	let ul0;
    	let li0;
    	let a1;
    	let i0;
    	let t3;
    	let li1;
    	let a2;
    	let i1;
    	let t4;
    	let li2;
    	let a3;
    	let i2;
    	let t5;
    	let li3;
    	let a4;
    	let i3;
    	let t6;
    	let div1;
    	let h30;
    	let t8;
    	let ul1;
    	let li4;
    	let a5;
    	let t10;
    	let li5;
    	let a6;
    	let t12;
    	let li6;
    	let a7;
    	let t14;
    	let li7;
    	let a8;
    	let t16;
    	let li8;
    	let a9;
    	let t18;
    	let li9;
    	let a10;
    	let t20;
    	let div2;
    	let h31;
    	let t22;
    	let ul2;
    	let li10;
    	let i4;
    	let t23;
    	let t24;
    	let li11;
    	let i5;
    	let t25;
    	let t26;
    	let li12;
    	let i6;
    	let a11;
    	let t28;
    	let div11;
    	let div10;
    	let div9;
    	let div7;
    	let div6;
    	let p1;
    	let t30;
    	let div8;
    	let nav;
    	let ul3;
    	let li13;
    	let a12;
    	let t32;
    	let li14;
    	let a13;
    	let t34;
    	let li15;
    	let a14;
    	let t36;
    	let div12;
    	let a15;
    	let i7;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			p0 = element("p");
    			p0.textContent = "CharityPress online and raise money for charity and causes you’re passionate about.\r\n                        CharityPress is an innovative, cost-effective online.";
    			t2 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			i0 = element("i");
    			t3 = space();
    			li1 = element("li");
    			a2 = element("a");
    			i1 = element("i");
    			t4 = space();
    			li2 = element("li");
    			a3 = element("a");
    			i2 = element("i");
    			t5 = space();
    			li3 = element("li");
    			a4 = element("a");
    			i3 = element("i");
    			t6 = space();
    			div1 = element("div");
    			h30 = element("h3");
    			h30.textContent = "About Us";
    			t8 = space();
    			ul1 = element("ul");
    			li4 = element("li");
    			a5 = element("a");
    			a5.textContent = "About employee";
    			t10 = space();
    			li5 = element("li");
    			a6 = element("a");
    			a6.textContent = "How it works";
    			t12 = space();
    			li6 = element("li");
    			a7 = element("a");
    			a7.textContent = "Careers";
    			t14 = space();
    			li7 = element("li");
    			a8 = element("a");
    			a8.textContent = "Press";
    			t16 = space();
    			li8 = element("li");
    			a9 = element("a");
    			a9.textContent = "Blog";
    			t18 = space();
    			li9 = element("li");
    			a10 = element("a");
    			a10.textContent = "Contact";
    			t20 = space();
    			div2 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Contact Us";
    			t22 = space();
    			ul2 = element("ul");
    			li10 = element("li");
    			i4 = element("i");
    			t23 = text("Sector # 48, 123 Street, miosya road VIC 28, Australia.");
    			t24 = space();
    			li11 = element("li");
    			i5 = element("i");
    			t25 = text("(800) 123.456.7890 (800) 123.456.7890 +00 99 88 5647");
    			t26 = space();
    			li12 = element("li");
    			i6 = element("i");
    			a11 = element("a");
    			a11.textContent = "yourname@domain.com";
    			t28 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			p1 = element("p");
    			p1.textContent = "© Copyright 2018 Charity. - All Right's Reserved";
    			t30 = space();
    			div8 = element("div");
    			nav = element("nav");
    			ul3 = element("ul");
    			li13 = element("li");
    			a12 = element("a");
    			a12.textContent = "FAQ";
    			t32 = space();
    			li14 = element("li");
    			a13 = element("a");
    			a13.textContent = "Help Desk";
    			t34 = space();
    			li15 = element("li");
    			a14 = element("a");
    			a14.textContent = "Support";
    			t36 = space();
    			div12 = element("div");
    			a15 = element("a");
    			i7 = element("i");
    			if (!src_url_equal(img.src, img_src_value = "assets/images/footer_logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file, 7, 24, 332);
    			attr_dev(a0, "href", "index.html");
    			attr_dev(a0, "class", "xs-footer-logo");
    			add_location(a0, file, 6, 20, 262);
    			add_location(p0, file, 9, 20, 428);
    			attr_dev(i0, "class", "fa fa-facebook");
    			add_location(i0, file, 12, 62, 713);
    			attr_dev(a1, "href", "");
    			attr_dev(a1, "class", "color-facebook");
    			add_location(a1, file, 12, 28, 679);
    			add_location(li0, file, 12, 24, 675);
    			attr_dev(i1, "class", "fa fa-twitter");
    			add_location(i1, file, 13, 61, 815);
    			attr_dev(a2, "href", "");
    			attr_dev(a2, "class", "color-twitter");
    			add_location(a2, file, 13, 28, 782);
    			add_location(li1, file, 13, 24, 778);
    			attr_dev(i2, "class", "fa fa-dribbble");
    			add_location(i2, file, 14, 62, 917);
    			attr_dev(a3, "href", "");
    			attr_dev(a3, "class", "color-dribbble");
    			add_location(a3, file, 14, 28, 883);
    			add_location(li2, file, 14, 24, 879);
    			attr_dev(i3, "class", "fa fa-pinterest");
    			add_location(i3, file, 15, 63, 1021);
    			attr_dev(a4, "href", "");
    			attr_dev(a4, "class", "color-pinterest");
    			add_location(a4, file, 15, 28, 986);
    			add_location(li3, file, 15, 24, 982);
    			attr_dev(ul0, "class", "xs-social-list-v2");
    			add_location(ul0, file, 11, 20, 619);
    			attr_dev(div0, "class", "col-lg-3 col-md-6 footer-widget xs-pr-20");
    			add_location(div0, file, 5, 16, 186);
    			attr_dev(h30, "class", "widget-title");
    			add_location(h30, file, 19, 20, 1225);
    			attr_dev(a5, "href", "index.html");
    			add_location(a5, file, 21, 28, 1342);
    			add_location(li4, file, 21, 24, 1338);
    			attr_dev(a6, "href", "#");
    			add_location(a6, file, 22, 28, 1416);
    			add_location(li5, file, 22, 24, 1412);
    			attr_dev(a7, "href", "#");
    			add_location(a7, file, 23, 28, 1479);
    			add_location(li6, file, 23, 24, 1475);
    			attr_dev(a8, "href", "#");
    			add_location(a8, file, 24, 28, 1537);
    			add_location(li7, file, 24, 24, 1533);
    			attr_dev(a9, "href", "#");
    			add_location(a9, file, 25, 28, 1593);
    			add_location(li8, file, 25, 24, 1589);
    			attr_dev(a10, "href", "#");
    			add_location(a10, file, 26, 28, 1648);
    			add_location(li9, file, 26, 24, 1644);
    			attr_dev(ul1, "class", "xs-footer-list");
    			add_location(ul1, file, 20, 20, 1285);
    			attr_dev(div1, "class", "col-lg-4 col-md-6 footer-widget");
    			add_location(div1, file, 18, 16, 1158);
    			attr_dev(h31, "class", "widget-title");
    			add_location(h31, file, 30, 20, 1812);
    			attr_dev(i4, "class", "fa fa-home");
    			add_location(i4, file, 32, 28, 1929);
    			add_location(li10, file, 32, 24, 1925);
    			attr_dev(i5, "class", "fa fa-phone");
    			add_location(i5, file, 33, 28, 2045);
    			add_location(li11, file, 33, 24, 2041);
    			attr_dev(i6, "class", "fa fa-envelope-o");
    			add_location(i6, file, 34, 28, 2159);
    			attr_dev(a11, "href", "mailto:yourname@domain.com");
    			add_location(a11, file, 34, 60, 2191);
    			add_location(li12, file, 34, 24, 2155);
    			attr_dev(ul2, "class", "xs-info-list");
    			add_location(ul2, file, 31, 20, 1874);
    			attr_dev(div2, "class", "col-lg-4 col-md-6 footer-widget");
    			add_location(div2, file, 29, 16, 1745);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file, 4, 12, 151);
    			attr_dev(div4, "class", "xs-footer-top-layer");
    			add_location(div4, file, 3, 8, 104);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file, 2, 4, 71);
    			add_location(p1, file, 46, 24, 2634);
    			attr_dev(div6, "class", "xs-copyright-text");
    			add_location(div6, file, 45, 20, 2577);
    			attr_dev(div7, "class", "col-md-6");
    			add_location(div7, file, 44, 16, 2533);
    			attr_dev(a12, "href", "#");
    			add_location(a12, file, 52, 32, 2900);
    			add_location(li13, file, 52, 28, 2896);
    			attr_dev(a13, "href", "#");
    			add_location(a13, file, 53, 32, 2958);
    			add_location(li14, file, 53, 28, 2954);
    			attr_dev(a14, "href", "#");
    			add_location(a14, file, 54, 32, 3022);
    			add_location(li15, file, 54, 28, 3018);
    			add_location(ul3, file, 51, 24, 2862);
    			attr_dev(nav, "class", "xs-footer-menu");
    			add_location(nav, file, 50, 20, 2808);
    			attr_dev(div8, "class", "col-md-6");
    			add_location(div8, file, 49, 16, 2764);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file, 43, 12, 2498);
    			attr_dev(div10, "class", "xs-copyright");
    			add_location(div10, file, 42, 8, 2458);
    			attr_dev(div11, "class", "container");
    			add_location(div11, file, 41, 4, 2425);
    			attr_dev(i7, "class", "fa fa-angle-up");
    			add_location(i7, file, 62, 43, 3267);
    			attr_dev(a15, "href", "#");
    			attr_dev(a15, "class", "xs-back-to-top");
    			add_location(a15, file, 62, 8, 3232);
    			attr_dev(div12, "class", "xs-back-to-top-wraper");
    			add_location(div12, file, 61, 4, 3187);
    			attr_dev(footer, "class", "xs-footer-section");
    			add_location(footer, file, 1, 0, 31);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img);
    			append_dev(div0, t0);
    			append_dev(div0, p0);
    			append_dev(div0, t2);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(a1, i0);
    			append_dev(ul0, t3);
    			append_dev(ul0, li1);
    			append_dev(li1, a2);
    			append_dev(a2, i1);
    			append_dev(ul0, t4);
    			append_dev(ul0, li2);
    			append_dev(li2, a3);
    			append_dev(a3, i2);
    			append_dev(ul0, t5);
    			append_dev(ul0, li3);
    			append_dev(li3, a4);
    			append_dev(a4, i3);
    			append_dev(div3, t6);
    			append_dev(div3, div1);
    			append_dev(div1, h30);
    			append_dev(div1, t8);
    			append_dev(div1, ul1);
    			append_dev(ul1, li4);
    			append_dev(li4, a5);
    			append_dev(ul1, t10);
    			append_dev(ul1, li5);
    			append_dev(li5, a6);
    			append_dev(ul1, t12);
    			append_dev(ul1, li6);
    			append_dev(li6, a7);
    			append_dev(ul1, t14);
    			append_dev(ul1, li7);
    			append_dev(li7, a8);
    			append_dev(ul1, t16);
    			append_dev(ul1, li8);
    			append_dev(li8, a9);
    			append_dev(ul1, t18);
    			append_dev(ul1, li9);
    			append_dev(li9, a10);
    			append_dev(div3, t20);
    			append_dev(div3, div2);
    			append_dev(div2, h31);
    			append_dev(div2, t22);
    			append_dev(div2, ul2);
    			append_dev(ul2, li10);
    			append_dev(li10, i4);
    			append_dev(li10, t23);
    			append_dev(ul2, t24);
    			append_dev(ul2, li11);
    			append_dev(li11, i5);
    			append_dev(li11, t25);
    			append_dev(ul2, t26);
    			append_dev(ul2, li12);
    			append_dev(li12, i6);
    			append_dev(li12, a11);
    			append_dev(footer, t28);
    			append_dev(footer, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div7);
    			append_dev(div7, div6);
    			append_dev(div6, p1);
    			append_dev(div9, t30);
    			append_dev(div9, div8);
    			append_dev(div8, nav);
    			append_dev(nav, ul3);
    			append_dev(ul3, li13);
    			append_dev(li13, a12);
    			append_dev(ul3, t32);
    			append_dev(ul3, li14);
    			append_dev(li14, a13);
    			append_dev(ul3, t34);
    			append_dev(ul3, li15);
    			append_dev(li15, a14);
    			append_dev(footer, t36);
    			append_dev(footer, div12);
    			append_dev(div12, a15);
    			append_dev(a15, i7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    var charities = {
    charities: [
        {
            id: 1,
            title: 'First Charity Project',
            category: 'Money',
            thumbnail: 'causes_4.jpg',
            pledged: 99000,
            target: 100000,
            date_end: +new Date('10 April 2022'),
            profile_photo: 'https://live.staticflickr.com/4027/435772810_7136f4a9e9_s.jpg',
            profile_name: 'Viroid Bueno',
            no_pledged: 0,
          
        }
    ]

    };

    /* src\pages\Home.svelte generated by Svelte v3.46.4 */

    function create_fragment$1(ctx) {
    	let header;
    	let t0;
    	let welcome;
    	let t1;
    	let charitylist;
    	let t2;
    	let promo;
    	let t3;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	welcome = new Welcome({ $$inline: true });
    	charitylist = new CharityList({ props: { charities: charities.charities }, $$inline: true });
    	promo = new Promo({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(welcome.$$.fragment);
    			t1 = space();
    			create_component(charitylist.$$.fragment);
    			t2 = space();
    			create_component(promo.$$.fragment);
    			t3 = space();
    			create_component(footer.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(welcome, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(charitylist, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(promo, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(welcome.$$.fragment, local);
    			transition_in(charitylist.$$.fragment, local);
    			transition_in(promo.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(welcome.$$.fragment, local);
    			transition_out(charitylist.$$.fragment, local);
    			transition_out(promo.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(welcome, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(charitylist, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(promo, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	let title = "Charity";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		CharityList,
    		Header,
    		Welcome,
    		Promo,
    		Footer,
    		charities: charities.charities,
    		title
    	});

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) title = $$props.title;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.4 */

    function create_fragment(ctx) {
    	let home;
    	let current;
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Home });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.querySelector("#root"),
    	
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
