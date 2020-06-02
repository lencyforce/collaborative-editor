import Quill from "quill";
const Block = Quill.import("blots/block");
const Parchment = Quill.import('parchment');
const Container = Quill.import("blots/container");

class ListItem extends Block {
    static formats(domNode) {
        return domNode.tagName === this.tagName ? undefined : super.formats(domNode);
    }

    format(name, value) {
        if (name === List.blotName && !value) {
            this.replaceWith(Parchment.create(this.statics.scope));
        } else if (name === 'indent') {
            if(value === '+1') {
                // Create an embed list
                let level = 1;

                if(this.parent.statics.blotName === EmbedList.blotName) {
                    // Not first level
                    let formats = this.parent.formats();
                    level = formats.level + 1;
                }

                let listType = this.parent.domNode.tagName === 'UL' ? 'unordered' : 'ordered';
                let embedList = this.replaceWith(EmbedList.blotName, {'type': listType, 'level': level});
                let embedListItem = embedList.children;
                this.moveChildren(embedListItem);

            } else if(value === '-1') {

            }
        } else {
            super.format(name, value);
        }
    }

    remove() {
        if (this.prev == null && this.next == null) {
            this.parent.remove();
        } else {
            super.remove();
        }
    }

    replaceWith(name, value) {

        if(name === EmbedList.blotName) {

            return super.replaceWith(name, value);

        } else {
            this.parent.isolate(this.offset(this.parent), this.length());
            if (name === this.parent.statics.blotName) {
                this.parent.replaceWith(name, value);
                return this;
            } else {
                this.parent.unwrap();
                return super.replaceWith(name, value);
            }
        }
    }
}
ListItem.blotName = 'list-item';
ListItem.className = 'list-item';
ListItem.tagName = 'LI';

class EmbedList extends Container {
    static create(value) {
        let tagName = value.type === 'ordered' ? 'OL' : 'UL';
        let node = super.create(tagName);
        node.setAttribute('data-level', value.level);
        return node;
    }

    static formats(domNode) {
        return {
            type: domNode.tagName === 'OL' ? 'ordered' : 'unordered',
            level: domNode.getAttribute('data-level')
        };
    }

    constructor(domNode) {
        super(domNode);
    }

    format(name, value) {
        if (this.children.length > 0) {
            this.children.tail.format(name, value);
        }
    }

    formats() {
        // We don't inherit from FormatBlot
        return { [this.statics.blotName]: this.statics.formats(this.domNode) };
    }

    replace(target) {
        if (target.statics.blotName !== this.statics.blotName) {
            let item = Parchment.create(this.statics.defaultChild);
            target.moveChildren(item);
            this.appendChild(item);
        }
        super.replace(target);
    }
}

EmbedList.blotName = 'embed-list';
EmbedList.className = 'embed-list';
EmbedList.tagName = ['OL', 'UL'];
EmbedList.defaultChild = 'list-item';
EmbedList.allowedChildren = [ListItem];
EmbedList.scope = Parchment.Scope.BLOCK_BLOT;

class List extends Container {
    static create(value) {
        let tagName = value === 'ordered' ? 'OL' : 'UL';
        let node = super.create(tagName);
        if (value === 'checked' || value === 'unchecked') {
            node.setAttribute('data-checked', value === 'checked');
        }
        return node;
    }

    static formats(domNode) {
        if (domNode.tagName === 'OL') return 'ordered';
        if (domNode.tagName === 'UL') {
            if (domNode.hasAttribute('data-checked')) {
                return domNode.getAttribute('data-checked') === 'true' ? 'checked' : 'unchecked';
            } else {
                return 'bullet';
            }
        }
        return undefined;
    }

    constructor(domNode) {
        super(domNode);
        const listEventHandler = (e) => {
            if (e.target.parentNode !== domNode) return;
            let format = this.statics.formats(domNode);
            let blot = Parchment.find(e.target);
            if (format === 'checked') {
                blot.format('list', 'unchecked');
            } else if(format === 'unchecked') {
                blot.format('list', 'checked');
            }
        }

        domNode.addEventListener('touchstart', listEventHandler);
        domNode.addEventListener('mousedown', listEventHandler);
    }

    format(name, value) {
        if (this.children.length > 0) {
            this.children.tail.format(name, value);
        }
    }

    formats() {
        // We don't inherit from FormatBlot
        return { [this.statics.blotName]: this.statics.formats(this.domNode) };
    }

    insertBefore(blot, ref) {
        if (blot instanceof ListItem || blot instanceof EmbedList) {
            super.insertBefore(blot, ref);
        } else {
            let index = ref == null ? this.length() : ref.offset(this);
            let after = this.split(index);
            after.parent.insertBefore(blot, after);
        }
    }

    optimize(context) {
        super.optimize(context);
        let next = this.next;
        if (next != null && next.prev === this &&
            next.statics.blotName === this.statics.blotName &&
            next.domNode.tagName === this.domNode.tagName &&
            next.domNode.getAttribute('data-checked') === this.domNode.getAttribute('data-checked')) {
            next.moveChildren(this);
            next.remove();
        }
    }

    replace(target) {
        if (target.statics.blotName !== this.statics.blotName) {
            let item = Parchment.create(this.statics.defaultChild);
            target.moveChildren(item);
            this.appendChild(item);
        }
        super.replace(target);
    }
}

List.blotName = 'list';
List.className = 'list';
List.scope = Parchment.Scope.BLOCK_BLOT;
List.tagName = ['OL', 'UL'];
List.defaultChild = 'list-item';
List.allowedChildren = [EmbedList, ListItem];

export { EmbedList, ListItem, List as default };
