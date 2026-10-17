`en-FR` is not a [Unicode locale](https://github.com/unicode-org/cldr-json/blob/master/cldr-json/cldr-core/availableLocales.json), and French is the only official language in France.

If you want to use an English locale with military time (24h) by default, maybe you can try `en-GB` (UK)?

To create a custom locale, it's somewhat invovled but you can follow the contribution guide in the documentation: https://date-fns.org/docs/I18n-Contribution-Guide

> Or perhaps have a way of getting the locale using two coordinates, language and region. Since region will dictate the format while language would dictate the text.

You can't dissociate the language from the region, that's the whole idea of a locale is it not? There can be regional differences to the languages too, not just changes in format. And a country doesn't necessarily share the same formatting shape for all its languages (see `en-CA` vs `fr-CA` below).

<img width="687" alt="Screen Shot 2021-08-29 at 10 09 52 AM" src="https://user-images.githubusercontent.com/4009209/131253361-0bead3c9-d1cd-4660-b856-935471b5f48b.png">

Hope this helps!
