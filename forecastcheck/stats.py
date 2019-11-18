__all__ = ['AveError', 'Bias', 'Accuracy', 'SimpleError', 'BinCount']

import copy

class AveError(object):
    """Use to calculate mean error.

    Supports the standard add and sub operators with another AveError
    or float representing an individual error. The repr method returns
    a string representation of the object, which is JSON serializable.
    Should be initialized with no arguments or the initial values
    desired for all attributes.

    Attributes:
        error (float): Mean of of the errors recorded.
        n (int): Number of individual errors recorded.

    """
    def __init__(self, error=0.0, n=0):
        self.error = error
        self.n = n

    def __str__(self):
        return str(self.error)

    def __repr__(self):
        return '{0.__dict__}'.format(self)

    def __add__(self, addend):
        total_n = 0

        if addend is not None:
            add_n = addend.n if isinstance(addend, AveError) else 1
            error = addend.error if isinstance(addend, AveError) else addend
            total_abs_error = self.error*self.n + abs(error)*add_n
            total_n = self.n + add_n

        if total_n == 0:
            return self
        else:
            return AveError(total_abs_error/total_n, total_n)

    def __sub__(self, subtrahend):
        total_n = 0

        if subtrahend is not None:
            is_ave_error = isinstance(subtrahend, AveError)
            sub_n = subtrahend.n if is_ave_error else 1
            error = subtrahend.error if is_ave_error else subtrahend
            total_abs_error = self.error*self.n - abs(error)*sub_n
            if total_abs_error < 0:
                raise ValueError(
                    'AveError subtraction resulted in a negative total error.'
                )
            total_n = self.n - sub_n

        if total_n == 0:
            return self
        else:
            return AveError(total_abs_error/total_n, total_n)


class Bias(object):
    """Use to calculate bias.

    Supports the standard add and sub operators with another Bias
    or float representing an individual error. The repr method returns
    a string representation of the object, which is JSON serializable.
    Should be initialized with no arguments or the initial values
    desired for all attributes.

    Attributes:
        bias (float): Mean of of the errors recorded.
        n (int): Number of individual errors recorded.

    """
    def __init__(self, bias=0.0, n=0):
        self.bias = bias
        self.n = n

    def __str__(self):
        return str(self.bias)

    def __repr__(self):
        return '{0.__dict__}'.format(self)

    def __add__(self, addend):
        if addend is not None:
            add_n = addend.n if isinstance(addend, Bias) else 1
            bias = addend.bias if isinstance(addend, Bias) else addend
            total_bias = self.bias*self.n + bias*add_n
            n = self.n + add_n

            return self if n == 0 else Bias(total_bias/n, n)
        else:
            return self

    def __sub__(self, subtrahend):
        if subtrahend is not None:
            is_bias = isinstance(subtrahend, Bias)
            sub_n = subtrahend.n if is_bias else 1
            bias = subtrahend.bias if is_bias else subtrahend
            total_bias = self.bias*self.n - bias*sub_n
            n = self.n - sub_n

            return Bias() if n == 0 else Bias(total_bias/n, n)
        else:
            return self


class Accuracy(object):
    """Use to calculate accuracy.

    Supports the standard add and sub operators with another Accuracy
    or float representing an individual error. The repr method returns
    a string representation of the object, which is JSON serializable.
    Should be initialized with no arguments or the initial values
    desired for all attributes.

    Attributes:
        error_threshold (float): Maximum error amount accepted as
            accurate.
        accuracy (float): Portion of individual error amounts
            considered accurate.
        n (int): Number of individual errors recorded.

    """
    def __init__(self, error_threshold=0, accuracy=0.0, n=0):
        self.error_threshold = error_threshold
        self.accuracy = accuracy
        self.n = n

    def __str__(self):
        return str(self.accuracy)

    def __repr__(self):
        return '{0.__dict__}'.format(self)

    def __add__(self, addend):
        if isinstance(addend, Accuracy):
            n = self.n + addend.n
            if n > 0:
                accuracy = (self.accuracy*self.n + addend.accuracy*addend.n)/n
            else:
                accuracy = self.accuracy
        elif addend is not None:
            n = self.n + 1
            if abs(addend) <= self.error_threshold:
                accuracy = (self.accuracy*self.n + 1)/n
            else:
                accuracy = self.accuracy*self.n/n
        else:
            return self

        return Accuracy(self.error_threshold, accuracy, n)

    def __sub__(self, subtrahend):
        if isinstance(subtrahend, Accuracy):
            n = self.n - subtrahend.n
            if n == 0:
                accuracy = 0.0
            else:
                accuracy = (self.accuracy*self.n
                            - subtrahend.accuracy*subtrahend.n)/n
        elif subtrahend is not None:
            n = self.n - 1
            if n == 0:
                accuracy = 0.0
            elif abs(subtrahend) <= self.error_threshold:
                accuracy = (self.accuracy*self.n - 1)/n
            else:
                accuracy = self.accuracy*self.n/n
        else:
            return self

        return Accuracy(self.error_threshold, accuracy, n)


class SimpleError(object):
    """Use to calculate simple error statistics.

    Supports the standard add and sub operators with another SimpleError
    or float representing an individual error. The repr method returns
    a string representation of the object, which is JSON serializable.
    Should be initialized with the error_threshold for the related
    Accuracy instance. Initial class instances may also be provided for
    the attributes, but this functionality exists mainly to support the
    class's add and sub operator methods.

    Attributes:
        ave_error (obj): Related AveError instance
        bias (obj): Related Bias instance
        accuracy (obj): Related Accuracy instance
        error_threshold (float): Maximum error amount accepted as
            accurate.

    """

    def __init__(
        self,
        ave_error=None,
        bias=None,
        accuracy=None,
        error_threshold=0
    ):
        self.ave_error = ave_error or AveError()
        self.bias = bias or Bias()
        self.accuracy = accuracy or Accuracy(error_threshold)

    def __str__(self):
        return (
            '{{error: {0.ave_error!s},'
            ' bias: {0.bias!s},'
            ' accuracy: {0.accuracy!r}}}'
        ).format(self)

    def __repr__(self):
        return '{0.__dict__}'.format(self)

    def __add__(self, addend):
        if isinstance(addend, SimpleError):
            new_value = SimpleError(
                self.ave_error + addend.ave_error,
                self.bias + addend.bias,
                self.accuracy + addend.accuracy
            )
        else:
            new_value = SimpleError(
                self.ave_error + addend,
                self.bias + addend,
                self.accuracy + addend
            )

        return new_value

    def __sub__(self, subtrahend):
        if isinstance(subtrahend, SimpleError):
            new_value = SimpleError(
                self.ave_error - subtrahend.ave_error,
                self.bias - subtrahend.bias,
                self.accuracy - subtrahend.accuracy
            )
        else:
            new_value = SimpleError(
                self.ave_error - subtrahend,
                self.bias - subtrahend,
                self.accuracy - subtrahend
            )

        return new_value


class BinCount(object):
    """Use to keep track of bin counts of observations for given forecasts.

    The repr method returns a string representation of the object, which
    is JSON serializable. Should be initialized with no arguments or a
    dicitonary of the intial bin counts to use.

    Attributes:
        bins (dict of int: dict of str: int): Hold the counts of
            forecasts and observations (the fcasts and obs keys,
            repectively) that fall into the percent probablity bin the
            parent dictionary key represents.

    """
    def __init__(self, bins=None):
        if bins is not None:
            self.bins = copy.deepcopy(bins)
        else:
            self.bins = {
                0: {'fcasts': 0, 'obs': 0},
                10: {'fcasts': 0, 'obs': 0},
                20: {'fcasts': 0, 'obs': 0},
                30: {'fcasts': 0, 'obs': 0},
                40: {'fcasts': 0, 'obs': 0},
                50: {'fcasts': 0, 'obs': 0},
                60: {'fcasts': 0, 'obs': 0},
                70: {'fcasts': 0, 'obs': 0},
                80: {'fcasts': 0, 'obs': 0},
                90: {'fcasts': 0, 'obs': 0},
                100: {'fcasts': 0, 'obs': 0}
            }

    def __str__(self):
        return str(self.bins)

    def __repr__(self):
        return "{{'bin_count': {{'bins': {0}, 'bias': {1}}}}}".format(
            {'{}'.format(k): v for k, v in sorted(self.bins.items())},
            self.bias()
        )

    def get_ob_n(self):
        """Sum observed precip events.

        Returns:
            Sum of precipation events observed.
        """
        return sum(value['obs'] for value in self.bins.values())

    def get_predicted_n(self):
        """Returns:
            Sum of precipation events expected based on the forecasted
            probablities.
        """
        return sum(
            (key/100.0)*value['fcasts'] for key, value in self.bins.items())

    def reg_ob(self, value):
        """Register an observed precip event.

        Args:
            value (int): Percent forecast chance at time of observation.

        Returns:
            None

        """
        for bin_ in sorted(self.bins):
            if value <= bin_:
                self.bins[bin_]['obs'] += 1
                self.bins[bin_]['fcasts'] += 1

                break

    def rem_ob(self, value):
        """Remove an observed precip event

        Args:
            value (int): Percent forecast chance at time of observation

        Returns:
            None

        """
        for bin_ in sorted(self.bins):
            if value <= bin_:
                self.bins[bin_]['obs'] -= 1
                self.bins[bin_]['fcasts'] -= 1

                break

    def reg_predicted(self, value):
        """Register a precipiation probability forecast.

        Args:
            value (int): Probability of precip in percent.

        Returns:
            None

        """
        for bin_ in sorted(self.bins):
            if value <= bin_:
                self.bins[bin_]['fcasts'] += 1

                break

    def rem_predicted(self, value):
        """Remove a precipiation probability forecast.

        Args:
            value (int): Probability of precip in percent.

        Returns:
            None

        """
        for bin_ in sorted(self.bins):
            if value <= bin_:
                self.bins[bin_]['fcasts'] -= 1

                break

    def bias(self):
        """ Calculate bias.

        Returns:
            The percent difference of the expected number of precip
            precip events vs what was.

        """
        if self.get_ob_n() != 0:
            return (self.get_predicted_n()/self.get_ob_n() - 1)*100
        else:
            return 0
