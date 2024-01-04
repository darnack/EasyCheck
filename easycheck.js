/* EasyCheck JS
** Created by Elkin Lesmes, 2015-09-23  
** Last update (2023-07-21):
	 * Adds EasyCheckInit global method
*/

window.EasyCheckInit = function () {
    let forms = $('form.validate');
    let validators = [];

    forms.each(function () {
        validators.push(new EasyCheck($(this)));
    });

    return validators;
}

const EasyCheck = function (form) {

    let my = {};
    let fields = [];
    let valid = true;
    let count = 0;    
    let formId = '';
    my.form = form;

    let constructor = function () {

        formId = Math.random().toString().replace('.', '');
        $(my.form).attr('id', formId);

        // get all fields from form
        let domFields = $(my.form).find('[class*=\'validate\']');        
        // add fields to control list
        for (const element of domFields) {
            addField($(element));
        }

        let button = $(my.form).find('input.validator, button.validator, a.validator');

        if (button == undefined || button.length == 0)
            throw new Error('Se requiere un botón de validación')

        $(button[0]).on('click', function (e) {
            
            if (!my.validate()) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        });
    }

    let addField = function ($field) {
        // extract rules
        let sClass = $field.attr('class');
        let start = sClass.indexOf('{') + 1;
        let end = sClass.indexOf('}');
        let rules = sClass.substring(start, end).split(',');
        // add event listener for fields            
        $field.change(function () {
            validateEvent(this);
        });
        $field.keyup(function () {
            validateEvent(this);
        });
        // asigns id by default
        if ($field.attr('id') === undefined) {
            $field.attr('id', formId + '_field' + (fields.length + count));
        }
        // construct field object
        let field = {
            id: $field.attr('id'),
            tagName: $field.prop('tagName').toLowerCase(),
            type: $field.prop('type'),
            value: undefined,
            rules: rules,
            valid: true,
            enabled: true,
            $object: $field,
            message: []
        }
        // add field to control list
        fields[field.id] = field;
        count++;
        // add remove space event
        for (let i = 0; i < field.rules.length; i++) {
            let rule = field.rules[i].trim();
            if (rule === "digit" || rule === "number" || rule === "email" || rule === "password" || rule === "dateformat") {
                $field.on('input', function () {
                    this.value = this.value.replace(/[ ]/g, '');
                });
                break;
            }
        }
    }

    my.validate = function () {
        valid = true;
        // validate all fields
        for (id in fields) { validateField(fields[id]); }
        // establishes focus on first error field
        for (id in fields) {
            if (!fields[id].valid) {
                window.scrollTo({ top: fields[id].$object.offset().top, behavior: 'smooth' });
                break;
            }
        }
        // return valid flag
        return valid;
    }

    my.validateField = function (id) {
        validateField(fields[id]);
    }

    my.updateValue = function (id, value) {
        fields[id].$object.val(value);
    }

    my.addExtraField = function (id) {
        addField($("#" + id));
    }

    my.validationOff = function (id) {
        fields[id].enabled = false;
    }

    my.validationOn = function (id) {
        fields[id].enabled = true;
    }

    my.removeRule = function (id, rule) {
        fields[id].rules = arrayRemove(fields[id].rules, rule);        
    }

    my.addRule = function (id, rule) {
        fields[id].rules = arrayInsert(fields[id].rules, rule);        
    }

    my.customMessages = function (id, collection) {
        try {
            for (const prop in collection)
            {
                fields[id].message[prop] = collection[prop];
            }
        }
        catch { }
    }

    function arrayRemove(arr, value) {        
        return arr.filter(function (ele) {
            return ele != value;
        });
    }

    function arrayInsert(arr, value) {
        let items = arr.filter(function (ele) {
            return ele != value;
        });
        items.push(value);
        return items;
    }

    let validateEvent = function (domField) {
        validateField(fields[$(domField).attr('id')]);
    }

    let validateField = function (field) {
        try {
            field.valid = true; // restart field flag
            const type = typeof field.$object.val();
            field.value = type === 'string' ? field.$object.val().trim() : field.$object.val(); // refresh field value
            // restart styles
            $("span[data-id='" + field.id + "_error']").remove();
            field.$object.removeClass("error");
            // apply rules
            for (let i = 0; i < field.rules.length; i++) {
                // apply simple rules
                switch (field.rules[i].trim()) {
                    case "required": required(field); break;
                    case "checked": checked(field); break;
                    case "digit": digit(field); break;
                    case "money": money(field); break;
                    case "number": number(field); break;
                    case "decimal": decimal(field); break;
                    case "text": text(field); break;
                    case "alphanumeric": alphanumeric(field); break;
                    case "email": email(field); break;
                    case "password": password(field); break;
                    default:
                        // extract function properties
                        let start = field.rules[i].indexOf('(') + 1;
                        let end = field.rules[i].indexOf(')');
                        let func = field.rules[i].substring(0, field.rules[i].indexOf('('));
                        let param = field.rules[i].substring(start, end).trim();
                        // apply function rules
                        switch (func.trim()) {
                            case "equals": equals(field, param); break;
                            case "distinct": distinct(field, param); break;
                            case "minlength": minlength(field, param); break;
                            case "maxlength": maxlength(field, param); break;
                            case "minvalue": minvalue(field, param); break;
                            case "maxvalue": maxvalue(field, param); break;
                            case "dateformat": dateformat(field, param); break;
                            default: ; break;
                        }
                        ; break;
                }
            }
        } catch(e) {
            valid = false;
            field.valid = valid;
            message(field, "*Error en reglas de validación del campo. ");
        }
    }

    let required = function (field) {
        if ((field.value.length == 0 || (field.tagName === "select" && field.value == 0)) && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["required"] || "Debe completar este campo. ");
        }
    }

    let checked = function (field) {
        if (!field.$object.prop("checked") && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["checked"] || "Debe marcar este campo. ");
        }
    }

    let digit = function (field) {
        if (field.value.length > 0 && field.enabled) {
            let regex = /^(\d+)$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["digit"] || "Solo se admiten dígitos (0-9). ");
            }
        }
    }

    let money = function (field) {
        if (field.value.length > 0 && field.enabled) {
            
            let formatted_value = field.value.replace(/^0+/g, "0"); // elimina ceros consecutivos al comienzo
            formatted_value = formatted_value.replace(/^0[^,]/g, "0"); // no permite escritura de ceros a la izquierda
            formatted_value = formatted_value.replace(/^,*/g, ""); // elimina comas al comienzo

            // check for decimal
            if (formatted_value.indexOf(",") >= 0) {

                // get position of first decimal this prevents multiple decimals from being entered
                let decimal_pos = formatted_value.indexOf(",");
                // split number by decimal point
                let left_side = formatted_value.substring(0, decimal_pos);
                let right_side = formatted_value.substring(decimal_pos);
                // add commas to left side of number
                left_side = left_side.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                // validate right side
                right_side = right_side.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                // Limit decimal to only 2 digits
                right_side = right_side.substring(0, 2);
                // join number by .
                formatted_value = left_side + "," + right_side;

            } else {
                formatted_value = formatted_value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            }

            field.$object.val(formatted_value);

            let cleanValue = formatted_value.split('.').join('');
            cleanValue = cleanValue.split(',').join('.');

            field.value = cleanValue;
            field.valid = true;
        }
    }

    let number = function (field) {
        if (field.value.length > 0 && field.enabled) {
            let regex = /^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d +)?$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["number"] || "El valor debe ser númerico. ");
            }
        }
    }

    let decimal = function (field) {
        if (field.value.length > 0 && field.enabled) {
            let regex = /^(\d*\,)?\d+$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["decimal"] || "Formato decimal incorrecto. ");
            }
        }
    }

    let text = function (field) {
        if (field.value.length > 0 && field.enabled) {
            let regex = /^([a-zA-ZÑñáéíóúÁÉÍÓÚ]+(?: [a-zA-ZñÑáéíóúÁÉÍÓÚ]+)*)$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["text"] || "Contiene algúnos caracteres inválidos. ");
            }
        }
    }

    let alphanumeric = function (field) {
        if (field.value.length > 0 && field.enabled) {
            let regex = /^([a-zA-ZÑñáéíóúÁÉÍÓÚ0-9]+(?: [a-zA-ZñÑáéíóúÁÉÍÓÚ0-9]+)*)$/;
            if (!regex.test(field.value)) {
                valid = false;
                field.valid = valid;
                message(field, field.message["alphanumeric"] || "No se permiten caracteres especiales o espacios dobles. ");
            }
        }
    }

    let email = function (field) {
        if (field.value.length > 0 && field.enabled) {
            let regex = /^[_a-zA-Z0-9-]+(.[_a-zA-Z0-9-]+)*@[a-z0-9-]+(.[a-z0-9-]+)*[.]([a-z]{2,3})$/;
            if (!regex.test(field.value.toLowerCase().trim())) {
                valid = false;
                field.valid = valid;
                message(field, field.message["email"] || "No es un correo válido. ");
            }
        }
    }

    let password = function (field) {
        if (field.value.length > 0 && field.enabled) {
            let regex = /^(?=.*?[A-Z])(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{8,}$/;
            if (!regex.test(field.value.trim())) {
                valid = false;
                field.valid = valid;
                message(field, field.message["password"] || "La contraseña debe tener mínimo 8 caracteres que incluya una mayúscula, un número y un carácter especial");
            }
        }
    }

    let equals = function (field, field2) {
        if (field.value != $("#" + field2).val() && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["equals"] || "El valor de confirmación no coincide. ");
        }
    }

    let distinct = function (field, field2) {
        if (field.value == $("#" + field2).val() && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["distinct"] || "Este valor ya existe, ingrese uno diferente. ");
        }
    }

    let minlength = function (field, size) {
        if (field.value.length > 0 && field.enabled && field.value.length < size) {
            valid = false;
            field.valid = valid;
            message(field, field.message["minlength"] || "Debe contener al menos " + size + " caracteres. ");
        }
    }

    let maxlength = function (field, size) {
        if (field.value.length > size && field.enabled) {
            valid = false;
            field.valid = valid;
            message(field, field.message["maxlength"] || "No puede contener más de " + size + " caracteres. ");
        }
    }

    let minvalue = function (field, value) {
        if (field.value.length > 0 && field.enabled && parseFloat(field.value) <= parseFloat(value)) {
            valid = false;
            field.valid = valid;
            message(field, field.message["minvalue"] || "El valor debe ser mayor a " + value);
        }
    }

    let maxvalue = function (field, value) {
        if (field.value.length > 0 && field.enabled && parseFloat(field.value) >= parseFloat(value)) {
            valid = false;
            field.valid = valid;
            message(field, field.message["maxvalue"] || "El valor debe ser inferior a " + value);
        }
    }

    let dateformat = function (field, format) {
        if (field.value.length > 0 && field.enabled) {
            let exp = format.toLowerCase();
            exp = exp.replace(/dd/g, '(\\#{2})');
            exp = exp.replace(/d/g, '(\\#{1,2})');
            exp = exp.replace(/mm/g, '(\\#{2})');
            exp = exp.replace(/m/g, '(\\#{1,2})');
            exp = exp.replace(/y{4}/g, '(\\#{4})');
            exp = exp.replace(/#/g, 'd');
            const regex = new RegExp('^' + exp + '$');
            if (!field.value.match(regex)) {
                field.valid = false;
            } else {
                format = format.toLowerCase();
                if (field.value.length == 10) {
                    format = format.replace(/dd/, '#').replace(/d/, 'dd').replace(/#/, 'dd');
                    format = format.replace(/mm/, '#').replace(/m/, 'mm').replace(/#/, 'mm');
                }
                if (field.value.length == 9) {
                    format = format.replace(/mm/, '#').replace(/m/, 'mm').replace(/#/, 'mm');
                }
                // day
                let a = format.match('d{1,2}').index;
                let b = format.match('d{1,2}')[0].length;
                let day = parseInt(field.value.substring(a, a + b));
                //month
                a = format.match('m{1,2}').index;
                b = format.match('m{1,2}')[0].length;
                let month = parseInt(field.value.substring(a, a + b));
                //year
                a = format.match('y{2,4}').index;
                b = format.match('y{2,4}')[0].length;
                let year = parseInt(field.value.substring(a, a + b));

                if (month == 4 || month == 6 || month == 9 || month == 11) {
                    if (day > 30) {
                        field.valid = false;
                    }
                } else {
                    if (month == 2) {
                        if ((year % 4 == 0 && day > 29) || (year % 4 != 0 && day > 28)) {
                            field.valid = false;
                        }
                    } else {
                        if (day > 31 || (month < 1 || month > 12)) {
                            field.valid = false;
                        }
                    }
                }
            }

            if (!field.valid) {
                valid = false;
                message(field, field.message["dateformat"] || "Formato de fecha incorrecto. ");
            }
        }
    }

    let message = function (field, text) {
        if ($("span[data-id='" + field.id + "_error']").length > 0) {
            $("span[data-id='" + field.id + "_error']").append('<span class="message">*' + text + '</span>');;
        } else {
            let top = (field.type === "checkbox") ? 22 : 0;
            field.$object.after('<span data-id="' + field.id + '_error" class="error" style="margin-top:' + top + 'px"><span class="message">*' + text + '</span></span>');
            field.$object.addClass('error');
        }
    }

    constructor(); // invoke constructor

    return my;
};
