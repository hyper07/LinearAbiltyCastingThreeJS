/**
 * Example Python programs for the Code panel's "Examples…" menu: the usual
 * first steps on a Raspberry Pi (gpiozero and RPi.GPIO) and a BeagleBone
 * (Adafruit_BBIO). Each says in a comment how to wire it.
 */
import type { BoardDef } from '../../model/boards'

export interface PyExample {
  id: string
  title: string
  family: 'pi' | 'beagle'
  code: (b: BoardDef) => string
}

export const PYTHON_EXAMPLES: PyExample[] = [
  {
    id: 'blink',
    title: 'Blink (gpiozero)',
    family: 'pi',
    code: () => `# Blink: LED on GPIO17 (pin 11) -> 330 ohm -> GND (pin 9)
from gpiozero import LED
from time import sleep

led = LED(17)

while True:
    led.on()
    sleep(1)
    led.off()
    sleep(1)
`,
  },
  {
    id: 'button',
    title: 'Button lights an LED',
    family: 'pi',
    code: () => `# Button on GPIO27 (pin 13) to GND; LED on GPIO17 (pin 11) -> 330 ohm -> GND.
# The Pi's internal pull-up holds GPIO27 HIGH; pressing pulls it LOW.
from gpiozero import LED, Button
from signal import pause

led = LED(17)
button = Button(27)

button.when_pressed = led.on
button.when_released = led.off

pause()
`,
  },
  {
    id: 'count',
    title: 'Count button presses',
    family: 'pi',
    code: () => `# Button on GPIO27 to GND. Each press prints the count.
from gpiozero import Button

button = Button(27)
count = 0

while True:
    button.wait_for_press()
    count += 1
    print(f"Pressed {count} time{'s' if count > 1 else ''}")
    button.wait_for_release()
`,
  },
  {
    id: 'pwm',
    title: 'Fade an LED (PWMLED)',
    family: 'pi',
    code: () => `# PWM: LED on GPIO18 (pin 12) -> 330 ohm -> GND. value 0.0 ... 1.0 is the duty cycle.
from gpiozero import PWMLED
from time import sleep

led = PWMLED(18)

while True:
    for step in range(0, 101, 5):
        led.value = step / 100
        sleep(0.05)
    for step in range(100, -1, -5):
        led.value = step / 100
        sleep(0.05)
`,
  },
  {
    id: 'traffic',
    title: 'Traffic lights',
    family: 'pi',
    code: () => `# Red GPIO22, amber GPIO27, green GPIO17 - each LED through 330 ohm to GND.
from gpiozero import LED
from time import sleep

red, amber, green = LED(22), LED(27), LED(17)

while True:
    green.on()
    sleep(3)
    green.off(); amber.on()
    sleep(1)
    amber.off(); red.on()
    sleep(3)
    amber.on()
    sleep(1)
    red.off(); amber.off()
`,
  },
  {
    id: 'rpigpio',
    title: 'Blink (RPi.GPIO, BOARD pins)',
    family: 'pi',
    code: () => `# RPi.GPIO with physical pin numbers: LED on pin 11 (GPIO17) -> 330 ohm -> GND.
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BOARD)
GPIO.setup(11, GPIO.OUT)

try:
    while True:
        GPIO.output(11, GPIO.HIGH)
        time.sleep(0.5)
        GPIO.output(11, GPIO.LOW)
        time.sleep(0.5)
except KeyboardInterrupt:
    GPIO.cleanup()
`,
  },
  {
    id: 'rpigpio-pwm',
    title: 'PWM + button (RPi.GPIO)',
    family: 'pi',
    code: () => `# LED on GPIO18 -> 330 ohm -> GND; button on GPIO27 to GND.
# Each press makes the LED brighter (duty cycle in percent).
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(18, GPIO.OUT)
GPIO.setup(27, GPIO.IN, pull_up_down=GPIO.PUD_UP)

pwm = GPIO.PWM(18, 1000)
pwm.start(0)
duty = 0

def pressed(channel):
    global duty
    duty = (duty + 25) % 125
    pwm.ChangeDutyCycle(duty)
    print("duty", duty, "%")

GPIO.add_event_detect(27, GPIO.FALLING, callback=pressed, bouncetime=50)

while True:
    time.sleep(1)
`,
  },
  {
    id: 'servo',
    title: 'Sweep a servo',
    family: 'pi',
    code: () => `# Servo signal on GPIO17, red to 5V (pin 2), brown to GND (pin 6).
from gpiozero import AngularServo
from time import sleep

servo = AngularServo(17, min_angle=-90, max_angle=90)

while True:
    for angle in (-90, -45, 0, 45, 90):
        servo.angle = angle
        print("angle", angle)
        sleep(1)
`,
  },
  {
    id: 'bbb-blink',
    title: 'Blink (Adafruit_BBIO)',
    family: 'beagle',
    code: () => `# LED on P8_10 -> 330 ohm -> GND (P9_1).
import Adafruit_BBIO.GPIO as GPIO
import time

GPIO.setup("P8_10", GPIO.OUT)

while True:
    GPIO.output("P8_10", GPIO.HIGH)
    time.sleep(1)
    GPIO.output("P8_10", GPIO.LOW)
    time.sleep(1)
`,
  },
  {
    id: 'bbb-adc',
    title: 'Read a pot on AIN0 (1.8 V max!)',
    family: 'beagle',
    code: () => `# Potentiometer between VDD_ADC (P9_32, 1.8 V) and GNDA_ADC (P9_34), wiper to AIN0 (P9_39).
# Never put 3.3 V or 5 V on an AIN pin - the BeagleBone's ADC takes at most 1.8 V.
import Adafruit_BBIO.ADC as ADC
import time

ADC.setup()

while True:
    value = ADC.read("P9_39")
    print(f"AIN0 = {value:.3f}  ({value * 1.8:.2f} V)")
    time.sleep(0.5)
`,
  },
  {
    id: 'bbb-pwm',
    title: 'Fade an LED (Adafruit_BBIO.PWM)',
    family: 'beagle',
    code: () => `# LED on P9_14 (EHRPWM1A) -> 330 ohm -> GND.
import Adafruit_BBIO.PWM as PWM
import time

PWM.start("P9_14", 0, 1000)

while True:
    for duty in range(0, 101, 5):
        PWM.set_duty_cycle("P9_14", duty)
        time.sleep(0.05)
`,
  },
]
